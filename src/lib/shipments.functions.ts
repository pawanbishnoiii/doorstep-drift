import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { quote } from "./pricing";

const party = {
  name: z.string().trim().min(2).max(100),
  phone: z.string().regex(/^[6-9]\d{9}$/),
  address: z.string().trim().min(8).max(400),
  pincode: z.string().regex(/^\d{6}$/),
  city: z.string().trim().min(2).max(80),
};

const input = z.object({
  service: z.enum(["standard", "express", "same_day"]),
  sender: z.object(party),
  receiver: z.object(party),
  pieces: z.array(z.object({ weight_kg: z.number().min(0.05).max(100) })).min(1).max(50),
  contents: z.string().trim().max(200).optional(),
  declared_value: z.number().min(0).max(1_000_000).default(0),
  payment_method: z.enum(["cash_on_pickup", "online"]).default("cash_on_pickup"),
});

export const createShipment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.input<typeof input>) => input.parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const { data: profile } = await sb.from("profiles").select("phone_verified").eq("id", context.userId).maybeSingle();
    if (!profile?.phone_verified) throw new Error("Verify your mobile number before booking.");

    // Pincodes must exist in the master list (serviceability)
    const { data: pins } = await sb.from("pincodes").select("pincode,city,state,zone,active").in("pincode", [data.sender.pincode, data.receiver.pincode]);
    const from = pins?.find((p) => p.pincode === data.sender.pincode);
    const to = pins?.find((p) => p.pincode === data.receiver.pincode);
    if (!from?.active) throw new Error(`Pickup pincode ${data.sender.pincode} is not serviceable yet.`);
    if (!to?.active) throw new Error(`Delivery pincode ${data.receiver.pincode} is not serviceable yet.`);

    const totalKg = data.pieces.reduce((a, p) => a + p.weight_kg, 0);
    const q = quote({ fromPin: data.sender.pincode, toPin: data.receiver.pincode, weightKg: totalKg, service: data.service });

    // Routing snapshot: origin Point owning the pickup pincode at booking time (never silently changed later)
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: alloc } = await supabaseAdmin.from("pincode_allocations").select("holder_user_id").eq("pincode", data.sender.pincode).eq("holder_role", "point").eq("status", "active").maybeSingle();
    let originPoint: string | null = null;
    if (alloc) {
      const { data: sc } = await supabaseAdmin.from("staff_scopes").select("point_id").eq("user_id", alloc.holder_user_id).eq("role", "point").is("revoked_at", null).not("point_id", "is", null).limit(1).maybeSingle();
      originPoint = sc?.point_id ?? null;
    }

    const { data: awb, error: awbErr } = await sb.rpc("next_awb");
    if (awbErr || !awb) throw new Error("Could not allocate AWB.");
    const online = data.payment_method === "online";
    const { data: row, error } = await sb.from("shipments").insert({
      tracking_number: awb,
      user_id: context.userId,
      service: data.service,
      sender_name: data.sender.name, sender_phone: data.sender.phone, sender_address: data.sender.address, sender_pincode: data.sender.pincode, sender_city: data.sender.city,
      receiver_name: data.receiver.name, receiver_phone: data.receiver.phone, receiver_address: data.receiver.address, receiver_pincode: data.receiver.pincode, receiver_city: data.receiver.city,
      weight_kg: q.weight, contents: data.contents ?? null, declared_value: data.declared_value, price: q.total,
      pieces_count: data.pieces.length,
      payment_method: data.payment_method,
      payment_status: "pending",
      status: online ? "awaiting_payment" : "booked",
      origin_point_id: originPoint,
      routing_snapshot: { origin_state: from.state, origin_zone: from.zone, dest_state: to.state, dest_zone: to.zone, origin_point_user: alloc?.holder_user_id ?? null, quote: q },
    }).select("id, tracking_number, price, status").single();
    if (error) throw new Error(error.message);

    const pieceRows = [];
    for (const [i, p] of data.pieces.entries()) {
      const { data: code } = await sb.rpc("next_piece_code");
      if (!code) throw new Error("Could not allocate piece ID.");
      pieceRows.push({ shipment_id: row.id, piece_code: code, seq_no: i + 1, total: data.pieces.length, weight_kg: p.weight_kg, contents: data.contents ?? null });
    }
    const { error: pErr } = await sb.from("shipment_pieces").insert(pieceRows);
    if (pErr) throw new Error(pErr.message);
    await sb.from("tracking_events").insert({ shipment_id: row.id, status: row.status, location: data.sender.city, note: online ? "Awaiting online payment" : "Pickup requested" });
    return row;
  });

/** Online payment gateway is not configured yet; customers can switch to pay-at-pickup. */
export const switchToCashOnPickup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { awb: string }) => z.object({ awb: z.string().max(20) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: s } = await context.supabase.from("shipments").select("id,status,user_id").eq("tracking_number", data.awb).maybeSingle();
    if (!s || s.user_id !== context.userId) throw new Error("Shipment not found.");
    if (s.status !== "awaiting_payment") throw new Error("This booking is already confirmed.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("shipments").update({ payment_method: "cash_on_pickup", status: "booked", updated_at: new Date().toISOString() }).eq("id", s.id);
    await supabaseAdmin.from("tracking_events").insert({ shipment_id: s.id, status: "booked", note: "Confirmed with pay at pickup" });
    return { ok: true };
  });

/** Find a user by email so staff can grant a role. Role check happens in the grant_staff_role DB function. */
export const grantRoleByEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { email: string; role: string; state?: string; point_id?: string }) =>
    z.object({ email: z.string().email().max(255), role: z.enum(["admin", "state_director", "state_manager", "area_manager", "network", "point"]), state: z.string().max(80).optional(), point_id: z.string().uuid().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: mine } = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId);
    if (!mine?.length) throw new Error("Staff only.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let found: string | null = null;
    for (let page = 1; page <= 20 && !found; page++) {
      const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
      found = list?.users.find((u) => u.email?.toLowerCase() === data.email.toLowerCase())?.id ?? null;
      if (!list || list.users.length < 200) break;
    }
    if (!found) throw new Error("No account with that email. Ask them to sign in once first.");
    const { error } = await context.supabase.rpc("grant_staff_role", { _user_id: found, _role: data.role, _state: data.state ?? undefined, _point_id: data.point_id ?? undefined });
    if (error) throw new Error(error.message);
    return { user_id: found };
  });
