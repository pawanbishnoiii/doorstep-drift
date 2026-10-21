import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { AppShell, PageHeader, Stat } from "@/components/site/AppShell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({ meta: [{ title: "Analytics — Get Xpress" }, { name: "description", content: "Shipment analytics for your scope." }, { property: "og:title", content: "Analytics — Get Xpress" }, { property: "og:description", content: "Shipment analytics for your scope." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: Analytics,
});

function Analytics() {
  const { data: rows = [] } = useQuery({
    queryKey: ["analytics-rows"],
    queryFn: async () => (await supabase.from("shipments").select("status,price,service,receiver_city,sender_city,created_at,routing_snapshot,payment_method,pieces_count").order("created_at", { ascending: false }).limit(2000)).data ?? [],
  });
  const a = useMemo(() => {
    const count = (f: (r: (typeof rows)[number]) => string) => Object.entries(rows.reduce<Record<string, number>>((m, r) => { const k = f(r); m[k] = (m[k] ?? 0) + 1; return m; }, {})).sort((x, y) => y[1] - x[1]);
    const delivered = rows.filter((r) => r.status === "delivered").length;
    return {
      total: rows.length, revenue: rows.filter((r) => r.status !== "cancelled").reduce((s, r) => s + Number(r.price), 0),
      parcels: rows.reduce((s, r) => s + r.pieces_count, 0), deliveredPct: rows.length ? Math.round((delivered / rows.length) * 100) : 0,
      byStatus: count((r) => r.status), byService: count((r) => r.service), byDest: count((r) => r.receiver_city).slice(0, 8),
      byZone: count((r) => ((r.routing_snapshot as { quote?: { zone?: string } })?.quote?.zone) ?? "unknown"), byPay: count((r) => r.payment_method),
    };
  }, [rows]);
  return (
    <AppShell wide>
      <PageHeader title="Analytics" sub="Live figures from shipments visible in your scope." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Shipments" value={a.total} tone="ink" />
        <Stat label="Parcels" value={a.parcels} />
        <Stat label="Revenue ₹" value={a.revenue.toLocaleString("en-IN")} tone="lime" />
        <Stat label="Delivered" value={`${a.deliveredPct}%`} tone="primary" />
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <Bars title="By status" data={a.byStatus} />
        <Bars title="Top destinations" data={a.byDest} />
        <Bars title="By zone" data={a.byZone} />
        <Bars title="By service" data={a.byService} />
        <Bars title="Payment mode" data={a.byPay} />
      </div>
    </AppShell>
  );
}

function Bars({ title, data }: { title: string; data: [string, number][] }) {
  const max = Math.max(1, ...data.map((d) => d[1]));
  return (
    <div className="rounded-3xl border bg-card p-5">
      <p className="font-bold">{title}</p>
      <div className="mt-3 space-y-2">
        {data.map(([k, v]) => (
          <div key={k}><div className="flex justify-between text-sm"><span className="capitalize">{k.replaceAll("_", " ")}</span><b>{v}</b></div><div className="mt-1 h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-primary" style={{ width: `${(v / max) * 100}%` }} /></div></div>
        ))}
        {data.length === 0 && <p className="text-sm text-muted-foreground">No data yet.</p>}
      </div>
    </div>
  );
}
