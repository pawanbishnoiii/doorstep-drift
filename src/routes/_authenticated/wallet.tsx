import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowDownLeft, ArrowUpRight, Plus, Wallet } from "lucide-react";
import { AppShell, PageHeader, Stat } from "@/components/site/AppShell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/wallet")({
  head: () => ({ meta: [{ title: "Wallet — Get Xpress" }, { name: "description", content: "Hub wallet balance, top-ups, booking deductions and commissions." }, { property: "og:title", content: "Wallet — Get Xpress" }, { property: "og:description", content: "Hub wallet balance and history." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: WalletPage,
});

function WalletPage() {
  const qc = useQueryClient();
  const [amt, setAmt] = useState(1000);
  const { data: me } = useQuery({ queryKey: ["me-id"], queryFn: async () => (await supabase.auth.getUser()).data.user?.id ?? "" });
  const { data: tx = [], error } = useQuery({
    queryKey: ["wallet", me], enabled: !!me,
    queryFn: async () => { const r = await supabase.from("wallet_transactions").select("*").eq("user_id", me ?? "").order("created_at", { ascending: false }).limit(500); if (r.error) throw r.error; return r.data; },
  });
  useEffect(() => {
    const ch = supabase.channel("wallet-live").on("postgres_changes", { event: "INSERT", schema: "public", table: "wallet_transactions" }, () => qc.invalidateQueries({ queryKey: ["wallet"] })).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);
  const sum = (k: string) => tx.filter((t) => t.kind === k).reduce((a, t) => a + Number(t.amount), 0);
  const balance = tx.reduce((a, t) => a + Number(t.amount), 0);
  const topup = async () => {
    const r = await supabase.rpc("wallet_topup", { _amount: amt, _ref: `DEMO-${Date.now()}` });
    if (r.error) toast.error(r.error.message); else { toast.success(`₹${amt} added`); qc.invalidateQueries({ queryKey: ["wallet"] }); }
  };
  return (
    <AppShell wide>
      <PageHeader title="Wallet" sub="Bookings are paid from this wallet; commissions are credited here." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Balance (₹)" value={balance.toLocaleString("en-IN")} tone="ink" />
        <Stat label="Added (₹)" value={sum("topup").toLocaleString("en-IN")} />
        <Stat label="Bookings (₹)" value={Math.abs(sum("booking")).toLocaleString("en-IN")} tone="primary" />
        <Stat label="Commission (₹)" value={sum("commission").toLocaleString("en-IN")} tone="lime" />
      </div>
      <div className="mt-5 flex flex-wrap items-end gap-3 rounded-2xl border bg-card p-5">
        <Wallet className="h-8 w-8 text-primary" />
        <label className="flex-1"><span className="text-xs font-bold text-muted-foreground">Add money (₹)</span><input aria-label="Top-up amount" type="number" min={100} value={amt} onChange={(e) => setAmt(Number(e.target.value))} className="mt-1 h-12 w-full rounded-xl border bg-background px-4 font-bold" /></label>
        {[500, 1000, 5000].map((v) => <Button key={v} variant="outline" className="h-12" onClick={() => setAmt(v)}>₹{v}</Button>)}
        <Button className="h-12" onClick={topup}><Plus /> Add money</Button>
        <p className="w-full text-xs text-muted-foreground">Demo payment — real payment gateway connects from admin settings.</p>
      </div>
      {error && <p className="mt-4 text-destructive">Wallet could not load.</p>}
      <div className="mt-5 overflow-x-auto rounded-2xl border bg-card">
        <table className="enterprise-table"><thead><tr><th>Date</th><th>Type</th><th>Reference</th><th>Note</th><th className="text-right">Amount</th></tr></thead>
          <tbody>{tx.map((t) => (
            <tr key={t.id}><td>{new Date(t.created_at).toLocaleString("en-IN")}</td><td className="capitalize">{Number(t.amount) >= 0 ? <ArrowDownLeft className="mr-1 inline h-4 w-4 text-primary" /> : <ArrowUpRight className="mr-1 inline h-4 w-4 text-destructive" />}{t.kind}</td><td className="font-mono text-xs">{t.ref}</td><td>{t.note}</td><td className={`text-right font-bold ${Number(t.amount) < 0 ? "text-destructive" : ""}`}>₹{Number(t.amount).toLocaleString("en-IN")}</td></tr>
          ))}</tbody></table>
        {tx.length === 0 && <p className="p-10 text-center text-muted-foreground">No wallet activity yet.</p>}
      </div>
    </AppShell>
  );
}
