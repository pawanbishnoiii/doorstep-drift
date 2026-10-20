import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Download, PackagePlus, PackageSearch, Printer, ScanLine, ShieldCheck, Truck } from "lucide-react";
import { AppShell } from "@/components/site/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/use-profile";
import { switchToCashOnPickup } from "@/lib/shipments.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "My shipments — DropBox" }, { name: "description", content: "Your DropBox shipments." }, { property: "og:title", content: "My shipments — DropBox" }, { property: "og:description", content: "Your DropBox shipments." }] }),
  component: Dashboard,
});

function Dashboard() {
  const { data: me } = useProfile();
  const qc = useQueryClient();
  const toCash = useServerFn(switchToCashOnPickup);
  const { data: roles = [] } = useQuery({ queryKey: ["my-roles"], queryFn: async () => (await supabase.from("user_roles").select("role")).data?.map((r) => r.role) ?? [] });
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["my-shipments"],
    queryFn: async () => {
      const { data, error } = await supabase.from("shipments").select("id,tracking_number,status,receiver_city,sender_city,price,created_at,service,pieces_count,payment_method,receiver_pincode,sender_pincode").eq("user_id", me!.user.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!me?.user,
  });
  const name = (me?.user.user_metadata?.["full_name"] as string | undefined)?.split(" ")[0] ?? "there";
  const isStaff = roles.length > 0;

  const exportXlsx = async () => {
    const XLSX = await import("xlsx");
    const ws = XLSX.utils.json_to_sheet(rows.map((r) => ({ awb: r.tracking_number, status: r.status, from: `${r.sender_city} ${r.sender_pincode}`, to: `${r.receiver_city} ${r.receiver_pincode}`, parcels: r.pieces_count, service: r.service, payment: r.payment_method, price: r.price, booked: r.created_at })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "shipments");
    XLSX.writeFile(wb, "my-shipments.xlsx");
  };

  return (
    <AppShell>
      <h1 className="font-display text-4xl font-extrabold tracking-tight">Hi {name} 👋</h1>
      <p className="text-muted-foreground">What are we sending today?</p>
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Link to="/ship" className="rounded-[28px] bg-primary p-5 text-primary-foreground shadow-glow"><PackagePlus className="h-7 w-7" /><p className="mt-6 font-display text-xl font-extrabold">Book pickup</p></Link>
        <Link to="/track" className="rounded-[28px] bg-lime p-5 text-ink"><PackageSearch className="h-7 w-7" /><p className="mt-6 font-display text-xl font-extrabold">Track parcel</p></Link>
        {isStaff && <Link to="/scan" className="rounded-[28px] bg-ink p-5 text-ink-foreground"><ScanLine className="h-7 w-7" /><p className="mt-6 font-display text-xl font-extrabold">Scan parcel</p></Link>}
        {isStaff && <Link to="/console" className="rounded-[28px] border bg-card p-5"><ShieldCheck className="h-7 w-7" /><p className="mt-6 font-display text-xl font-extrabold">Staff console</p></Link>}
      </div>
      <div className="mt-10 flex items-center justify-between">
        <h2 className="font-display text-2xl font-extrabold">Your shipments</h2>
        {rows.length > 0 && <button onClick={exportXlsx} className="flex items-center gap-1.5 rounded-xl border bg-card px-3 py-2 text-xs font-bold"><Download className="h-3.5 w-3.5" /> Excel</button>}
      </div>
      <div className="mt-4 space-y-3">
        {isLoading && <div className="h-20 animate-pulse rounded-3xl bg-muted" />}
        {!isLoading && rows.length === 0 && (
          <div className="rounded-[28px] border border-dashed p-10 text-center text-muted-foreground"><Truck className="mx-auto h-10 w-10" /><p className="mt-3 font-semibold">No shipments yet — book your first pickup.</p></div>
        )}
        {rows.map((s, i) => (
          <motion.div key={s.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="rounded-3xl border bg-card p-4">
            <Link to="/track" search={{ id: s.tracking_number }} className="flex items-center justify-between">
              <div>
                <p className="font-bold">{s.sender_city} → {s.receiver_city}</p>
                <p className="text-xs text-muted-foreground">{s.tracking_number} · {s.pieces_count} parcel{s.pieces_count > 1 ? "s" : ""} · {new Date(s.created_at).toLocaleDateString("en-IN")}</p>
              </div>
              <div className="text-right">
                <span className="rounded-full bg-cream px-3 py-1 text-xs font-bold capitalize">{s.status.replaceAll("_", " ")}</span>
                <p className="mt-1 text-sm font-bold">₹{s.price}</p>
              </div>
            </Link>
            <div className="mt-3 flex gap-2">
              {s.status === "awaiting_payment" ? (
                <button onClick={async () => {
                  try { await toCash({ data: { awb: s.tracking_number } }); toast.success("Confirmed with pay at pickup"); qc.invalidateQueries({ queryKey: ["my-shipments"] }); }
                  catch (e) { toast.error((e as Error).message); }
                }} className="h-10 flex-1 rounded-xl bg-primary text-sm font-bold text-primary-foreground">Confirm with pay at pickup</button>
              ) : s.status !== "cancelled" && (
                <Link to="/labels/$shipmentId" params={{ shipmentId: s.id }} className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border text-sm font-bold"><Printer className="h-4 w-4" /> Labels</Link>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </AppShell>
  );
}
