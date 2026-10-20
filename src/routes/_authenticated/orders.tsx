import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CreditCard, Download, Printer, Search } from "lucide-react";
import { AppShell, PageHeader } from "@/components/site/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useRoles } from "@/hooks/use-roles";
import { switchToCashOnPickup } from "@/lib/shipments.functions";

export const Route = createFileRoute("/_authenticated/orders")({
  head: () => ({ meta: [{ title: "Orders — DropBox" }, { name: "description", content: "All your DropBox orders with filters and export." }, { property: "og:title", content: "Orders — DropBox" }, { property: "og:description", content: "All your DropBox orders with filters and export." }] }),
  component: Orders,
});

const TABS = [["all", "All"], ["awaiting_payment", "Unpaid"], ["booked", "Ready to ship"], ["picked_up", "Picked up"], ["in_transit", "In transit"], ["out_for_delivery", "Out for delivery"], ["delivered", "Delivered"], ["cancelled", "Cancelled"]] as const;

function Orders() {
  const { isStaff } = useRoles();
  const qc = useQueryClient();
  const toCash = useServerFn(switchToCashOnPickup);
  const [tab, setTab] = useState<string>("all");
  const [q, setQ] = useState("");
  const [scope, setScope] = useState<"mine" | "scope">("mine");
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["orders", scope],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      let query = supabase.from("shipments").select("id,tracking_number,status,sender_name,sender_city,sender_pincode,receiver_name,receiver_city,receiver_pincode,price,discount,coupon_code,created_at,service,pieces_count,payment_method,payment_status").order("created_at", { ascending: false }).limit(500);
      if (scope === "mine") query = query.eq("user_id", u.user!.id);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
  useEffect(() => {
    const ch = supabase.channel("orders-live").on("postgres_changes", { event: "*", schema: "public", table: "shipments" }, () => qc.invalidateQueries({ queryKey: ["orders"] })).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const list = useMemo(() => rows.filter((r) => (tab === "all" || r.status === tab) && (!q || [r.tracking_number, r.receiver_name, r.receiver_city, r.receiver_pincode, r.sender_city].join(" ").toLowerCase().includes(q.toLowerCase()))), [rows, tab, q]);

  const exportXlsx = async () => {
    const XLSX = await import("xlsx");
    const ws = XLSX.utils.json_to_sheet(list.map((r) => ({ awb: r.tracking_number, status: r.status, from: `${r.sender_city} ${r.sender_pincode}`, to: `${r.receiver_name}, ${r.receiver_city} ${r.receiver_pincode}`, parcels: r.pieces_count, service: r.service, payment: r.payment_method, payment_status: r.payment_status, coupon: r.coupon_code ?? "", discount: r.discount, price: r.price, booked: r.created_at })));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "orders"); XLSX.writeFile(wb, "dropbox-orders.xlsx");
  };

  return (
    <AppShell wide>
      <PageHeader title="Orders" sub={`${list.length} of ${rows.length} orders`} action={
        <div className="flex gap-2">
          {isStaff && <select value={scope} onChange={(e) => setScope(e.target.value as "mine")} className="h-10 rounded-xl border bg-card px-3 text-sm font-bold"><option value="mine">My orders</option><option value="scope">All in my scope</option></select>}
          <button onClick={exportXlsx} className="flex h-10 items-center gap-1.5 rounded-xl border bg-card px-3 text-sm font-bold"><Download className="h-4 w-4" /> Export</button>
          <Link to="/ship" className="flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground">+ Add order</Link>
        </div>} />
      <div className="flex gap-1 overflow-x-auto border-b">
        {TABS.map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-bold ${tab === k ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>{l} <span className="text-xs">({k === "all" ? rows.length : rows.filter((r) => r.status === k).length})</span></button>)}
      </div>
      <label className="mt-4 flex h-11 items-center gap-2 rounded-xl border bg-card px-3"><Search className="h-4 w-4 text-muted-foreground" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search AWB, name, city, pincode" className="flex-1 bg-transparent text-sm font-semibold outline-none" /></label>

      <div className="mt-4 hidden overflow-hidden rounded-2xl border bg-card lg:block">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-xs uppercase tracking-wider text-muted-foreground"><tr><th className="p-3">Order / AWB</th><th>Route</th><th>Parcels</th><th>Payment</th><th>Status</th><th className="text-right">Amount</th><th className="p-3 text-right">Actions</th></tr></thead>
          <tbody>
            {list.map((s) => (
              <tr key={s.id} className="border-t">
                <td className="p-3"><Link to="/track" search={{ id: s.tracking_number }} className="font-mono font-bold text-primary">{s.tracking_number}</Link><p className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleString("en-IN")}</p></td>
                <td>{s.sender_city} → {s.receiver_city}<p className="text-xs text-muted-foreground">{s.receiver_name} · {s.receiver_pincode}</p></td>
                <td>{s.pieces_count}</td>
                <td className="capitalize">{s.payment_method.replaceAll("_", " ")}<p className="text-xs text-muted-foreground">{s.payment_status.replaceAll("_", " ")}</p></td>
                <td><span className="rounded-full bg-cream px-2.5 py-1 text-xs font-bold capitalize">{s.status.replaceAll("_", " ")}</span></td>
                <td className="text-right font-bold">₹{s.price}{Number(s.discount) > 0 && <p className="text-xs font-semibold text-primary">−₹{s.discount} {s.coupon_code}</p>}</td>
                <td className="p-3 text-right"><Actions s={s} onCash={async () => { try { await toCash({ data: { awb: s.tracking_number } }); toast.success("Confirmed with pay at pickup"); qc.invalidateQueries({ queryKey: ["orders"] }); } catch (e) { toast.error((e as Error).message); } }} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!isLoading && list.length === 0 && <p className="p-10 text-center text-muted-foreground">No orders here.</p>}
      </div>

      <div className="mt-4 space-y-2 lg:hidden">
        {list.map((s) => (
          <div key={s.id} className="rounded-2xl border bg-card p-4">
            <div className="flex justify-between"><Link to="/track" search={{ id: s.tracking_number }} className="font-mono text-sm font-bold text-primary">{s.tracking_number}</Link><span className="rounded-full bg-cream px-2.5 py-0.5 text-xs font-bold capitalize">{s.status.replaceAll("_", " ")}</span></div>
            <p className="mt-1 font-bold">{s.sender_city} → {s.receiver_city}</p>
            <p className="text-xs text-muted-foreground">{s.pieces_count} parcel · ₹{s.price}</p>
            <div className="mt-3"><Actions s={s} onCash={async () => { try { await toCash({ data: { awb: s.tracking_number } }); qc.invalidateQueries({ queryKey: ["orders"] }); } catch (e) { toast.error((e as Error).message); } }} /></div>
          </div>
        ))}
        {!isLoading && list.length === 0 && <p className="rounded-2xl border border-dashed p-8 text-center text-muted-foreground">No orders here.</p>}
      </div>
    </AppShell>
  );
}

function Actions({ s, onCash }: { s: { id: string; status: string }; onCash: () => void }) {
  if (s.status === "awaiting_payment") return (
    <div className="flex justify-end gap-1.5">
      <Link to="/pay/$shipmentId" params={{ shipmentId: s.id }} className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"><CreditCard className="h-3.5 w-3.5" /> Pay</Link>
      <button onClick={onCash} className="rounded-lg border px-3 py-1.5 text-xs font-bold">Pay at pickup</button>
    </div>
  );
  if (s.status === "cancelled") return null;
  return <Link to="/labels/$shipmentId" params={{ shipmentId: s.id }} className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-bold"><Printer className="h-3.5 w-3.5" /> Labels</Link>;
}
