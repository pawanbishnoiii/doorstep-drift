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
  weight_kg: z.number().min(0.05).max(100),
  contents: z.string().trim().max(200).optional(),
  declared_value: z.number().min(0).max(1_000_000).default(0),
});

export const createShipment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.input<typeof input>) => input.parse(d))
  .handler(async ({ data, context }) => {
    const { data: profile } = await context.supabase.from("profiles").select("phone_verified").eq("id", context.userId).maybeSingle();
    if (!profile?.phone_verified) throw new Error("Verify your mobile number before booking.");
    const q = quote({ fromPin: data.sender.pincode, toPin: data.receiver.pincode, weightKg: data.weight_kg, service: data.service });
    const n = new Uint32Array(2);
    crypto.getRandomValues(n);
    const tracking = `DBX${String(n[0] ?? 0).padStart(10, "0").slice(0, 10)}`;
    const { data: row, error } = await context.supabase.from("shipments").insert({
      tracking_number: tracking,
      user_id: context.userId,
      service: data.service,
      sender_name: data.sender.name, sender_phone: data.sender.phone, sender_address: data.sender.address, sender_pincode: data.sender.pincode, sender_city: data.sender.city,
      receiver_name: data.receiver.name, receiver_phone: data.receiver.phone, receiver_address: data.receiver.address, receiver_pincode: data.receiver.pincode, receiver_city: data.receiver.city,
      weight_kg: q.weight, contents: data.contents ?? null, declared_value: data.declared_value, price: q.total, status: "booked",
    }).select("id, tracking_number, price").single();
    if (error) throw new Error(error.message);
    await context.supabase.from("tracking_events").insert({ shipment_id: row.id, status: "booked", location: data.sender.city, note: "Pickup requested" });
    return row;
  });
