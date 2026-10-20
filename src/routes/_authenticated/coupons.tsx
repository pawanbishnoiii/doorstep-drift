import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Ticket } from "lucide-react";
import { AppShell, PageHeader } from "@/components/site/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useRoles } from "@/hooks/use-roles";

export const Route = createFileRoute("/_authenticated/coupons")({
  head: () => ({ meta: [{ title: "Offers & coupons — DropBox" }, { name: "description", content: "Create and manage DropBox shipping coupons." }, { property: "og:title", content: "Offers & coupons — DropBox" }, { property: "og:description", content: "Create and manage DropBox shipping coupons." }] }),
  component: Coupons,
});

function Coupons() {
  const { isAdmin } = useRoles();
  const qc = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ["coupons"], queryFn: async () => (await supabase.from("coupons").select("*").order("created_at", { ascending: false })).data ?? [] });
  const [f, setF] = useState({ code: "", description: "", discount_type: "percent", discount_value: "10", max_discount: "", min_order: "0", max_uses: "", per_user_limit: "1", expires_at: "" });
  const save = async () => {
    if (!/^[A-Z0-9]{3,30}$/.test(f.code)) return toast.error("Code: 3–30 letters/numbers");
    const { error } = await supabase.from("coupons").insert({
      code: f.code, description: f.description || null, discount_type: f.discount_type, discount_value: Number(f.discount_value),
      max_discount: f.max_discount ? Number(f.max_discount) : null, min_order: Number(f.min_order) || 0,
      max_uses: f.max_uses ? Number(f.max_uses) : null, per_user_limit: Number(f.per_user_limit) || 1,
      expires_at: f.expires_at ? new Date(f.expires_at).toISOString() : null,
    });
    if (error) toast.error(error.message); else { toast.success("Coupon created"); setF({ ...f, code: "", description: "" }); qc.invalidateQueries({ queryKey: ["coupons"] }); }
  };
  const toggle = async (id: string, active: boolean) => { await supabase.from("coupons").update({ active }).eq("id", id); qc.invalidateQueries({ queryKey: ["coupons"] }); };
  const inp = "h-11 rounded-xl border bg-background px-3 text-sm font-semibold outline-none";
  return (
    <AppShell wide>
      <PageHeader title="Offers & coupons" sub="Discounts are re-checked on the server at booking time." />
      {isAdmin && (
        <div className="mb-6 rounded-3xl border bg-card p-5">
          <p className="font-bold">New coupon</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
            <input className={inp} placeholder="CODE" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") })} />
            <select className={inp} value={f.discount_type} onChange={(e) => setF({ ...f, discount_type: e.target.value })}><option value="percent">% off</option><option value="flat">₹ flat off</option></select>
            <input className={inp} placeholder="Value" inputMode="decimal" value={f.discount_value} onChange={(e) => setF({ ...f, discount_value: e.target.value })} />
            <input className={inp} placeholder="Max discount ₹" value={f.max_discount} onChange={(e) => setF({ ...f, max_discount: e.target.value })} />
            <input className={inp} placeholder="Min order ₹" value={f.min_order} onChange={(e) => setF({ ...f, min_order: e.target.value })} />
            <input className={inp} placeholder="Total uses (blank = ∞)" value={f.max_uses} onChange={(e) => setF({ ...f, max_uses: e.target.value })} />
            <input className={inp} placeholder="Uses per user" value={f.per_user_limit} onChange={(e) => setF({ ...f, per_user_limit: e.target.value })} />
            <input className={inp} type="date" value={f.expires_at} onChange={(e) => setF({ ...f, expires_at: e.target.value })} />
            <input className={`${inp} sm:col-span-2`} placeholder="Description shown to customers" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
          </div>
          <button onClick={save} className="mt-3 h-11 rounded-xl bg-primary px-6 font-bold text-primary-foreground">Create coupon</button>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data.map((c) => (
          <div key={c.id} className={`rounded-3xl border-2 border-dashed bg-card p-5 ${c.active ? "border-primary" : "opacity-50"}`}>
            <div className="flex items-center justify-between"><p className="font-mono text-2xl font-extrabold">{c.code}</p><Ticket className="h-6 w-6 text-primary" /></div>
            <p className="mt-1 font-bold">{c.discount_type === "percent" ? `${c.discount_value}% off` : `₹${c.discount_value} off`}{c.max_discount ? ` (max ₹${c.max_discount})` : ""}</p>
            <p className="text-sm text-muted-foreground">{c.description}</p>
            <p className="mt-2 text-xs text-muted-foreground">Min ₹{c.min_order} · used {c.used_count}{c.max_uses ? `/${c.max_uses}` : ""} · {c.expires_at ? `till ${new Date(c.expires_at).toLocaleDateString("en-IN")}` : "no expiry"}</p>
            {isAdmin && <button onClick={() => toggle(c.id, !c.active)} className="mt-3 rounded-xl border px-3 py-1.5 text-xs font-bold">{c.active ? "Deactivate" : "Activate"}</button>}
          </div>
        ))}
        {data.length === 0 && <p className="rounded-3xl border border-dashed p-10 text-center text-muted-foreground sm:col-span-3">No coupons yet.</p>}
      </div>
    </AppShell>
  );
}
