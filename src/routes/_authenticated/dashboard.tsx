import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Crown, MapPin, PackagePlus, PackageSearch, ScanLine, ShieldCheck, Store, Users } from "lucide-react";
import { AppShell, PageHeader, Stat } from "@/components/site/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/use-profile";
import { ROLE_LABEL, useRoles } from "@/hooks/use-roles";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — DropBox" }, { name: "description", content: "Your DropBox shipping dashboard." }, { property: "og:title", content: "Dashboard — DropBox" }, { property: "og:description", content: "Your DropBox shipping dashboard." }] }),
  component: Dashboard,
});

type Summary = { shipments: number; today: number; revenue: number; by_status: Record<string, number>; last7: { d: string; n: number }[]; pincodes: number; delegated: number; team: number; applications: number; users: number };

function Dashboard() {
  const { data: me } = useProfile();
  const { roles, primary, isStaff, isAdmin } = useRoles();
  const qc = useQueryClient();
  const name = (me?.profile?.full_name || (me?.user.user_metadata?.["full_name"] as string | undefined) || "there").split(" ")[0];

  const { data: noAdmin } = useQuery({ queryKey: ["admin-exists"], queryFn: async () => !(await supabase.rpc("admin_exists")).data });
  const { data: mine = [] } = useQuery({
    queryKey: ["my-shipments"], enabled: !!me?.user,
    queryFn: async () => (await supabase.from("shipments").select("id,tracking_number,status,price,created_at,sender_city,receiver_city").eq("user_id", me!.user.id).order("created_at", { ascending: false }).limit(5)).data ?? [],
  });
  const { data: sum } = useQuery({ queryKey: ["summary"], enabled: isStaff, queryFn: async () => (await supabase.rpc("dashboard_summary")).data as unknown as Summary });

  const claim = async () => {
    const { error } = await supabase.rpc("claim_first_admin");
    if (error) return toast.error(error.message);
    toast.success("You are now the Admin");
    qc.invalidateQueries();
  };
  const max = Math.max(1, ...(sum?.last7 ?? []).map((x) => x.n));

  return (
    <AppShell wide>
      <PageHeader title={`Hi ${name} 👋`} sub={primary ? `${ROLE_LABEL[primary]} dashboard — data limited to your assigned scope.` : "What are we sending today?"}
        action={<div className="flex flex-wrap gap-1.5">{roles.map((r) => <span key={r} className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">{ROLE_LABEL[r]}</span>)}</div>} />

      {noAdmin && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-3xl border-2 border-dashed border-primary bg-primary/5 p-5">
          <div className="flex items-center gap-3"><Crown className="h-8 w-8 text-primary" /><div><p className="font-bold">No Admin has been set up yet</p><p className="text-sm text-muted-foreground">The first signed-in owner can claim Admin once. After that this option disappears for everyone.</p></div></div>
          <button onClick={claim} className="rounded-2xl bg-primary px-5 py-3 font-bold text-primary-foreground">Make me Admin</button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Link to="/ship" className="rounded-[28px] bg-primary p-5 text-primary-foreground shadow-glow"><PackagePlus className="h-7 w-7" /><p className="mt-6 font-display text-xl font-extrabold">Add order</p></Link>
        <Link to="/track" className="rounded-[28px] bg-lime p-5 text-ink"><PackageSearch className="h-7 w-7" /><p className="mt-6 font-display text-xl font-extrabold">Track parcel</p></Link>
        {isStaff ? <>
          <Link to="/scan" className="rounded-[28px] bg-ink p-5 text-ink-foreground"><ScanLine className="h-7 w-7" /><p className="mt-6 font-display text-xl font-extrabold">Scan parcel</p></Link>
          <Link to="/console" className="rounded-[28px] border bg-card p-5"><ShieldCheck className="h-7 w-7" /><p className="mt-6 font-display text-xl font-extrabold">Pincodes & staff</p></Link>
        </> : <Link to="/point-partner" className="col-span-2 rounded-[28px] border bg-card p-5 md:col-span-2"><Store className="h-7 w-7" /><p className="mt-6 font-display text-xl font-extrabold">Become a DropBox Point</p></Link>}
      </div>

      {isStaff && sum && (
        <section className="mt-8">
          <h2 className="font-display text-2xl font-extrabold">Your scope</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Shipments in scope" value={sum.shipments} tone="ink" />
            <Stat label="Booked today" value={sum.today} />
            <Stat label="Revenue (₹)" value={Number(sum.revenue).toLocaleString("en-IN")} tone="lime" />
            {isAdmin ? <Stat label="Pending applications" value={sum.applications} tone="primary" /> : <Stat label="My pincodes" value={sum.pincodes} tone="primary" />}
            <Stat label="Pincodes delegated" value={sum.delegated} />
            <Stat label="Team members" value={sum.team} />
            {isAdmin && <Stat label="Registered users" value={sum.users} />}
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <div className="rounded-3xl border bg-card p-5">
              <p className="font-bold">Bookings — last 7 days</p>
              <div className="mt-4 flex h-36 items-end gap-2">
                {sum.last7.map((x) => (
                  <div key={x.d} className="flex flex-1 flex-col items-center gap-1">
                    <span className="text-xs font-bold">{x.n}</span>
                    <motion.div initial={{ height: 0 }} animate={{ height: `${(x.n / max) * 100}%` }} className="w-full min-h-1 rounded-t-lg bg-primary" />
                    <span className="text-[10px] text-muted-foreground">{new Date(x.d).toLocaleDateString("en-IN", { weekday: "short" })}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-3xl border bg-card p-5">
              <p className="font-bold">By status</p>
              <div className="mt-3 space-y-2">
                {Object.entries(sum.by_status).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between text-sm"><span className="capitalize">{k.replaceAll("_", " ")}</span><span className="font-bold">{v}</span></div>
                ))}
                {Object.keys(sum.by_status).length === 0 && <p className="text-sm text-muted-foreground">No shipments in your scope yet.</p>}
              </div>
              <div className="mt-4 flex gap-2">
                <Link to="/analytics" className="rounded-xl border px-3 py-2 text-xs font-bold">Full analytics</Link>
                <Link to="/console" className="flex items-center gap-1 rounded-xl border px-3 py-2 text-xs font-bold"><MapPin className="h-3 w-3" /> Allocations</Link>
                <Link to="/console" className="flex items-center gap-1 rounded-xl border px-3 py-2 text-xs font-bold"><Users className="h-3 w-3" /> Team</Link>
              </div>
            </div>
          </div>
        </section>
      )}

      <div className="mt-10 flex items-center justify-between">
        <h2 className="font-display text-2xl font-extrabold">Recent orders</h2>
        <Link to="/orders" className="text-sm font-bold text-primary">View all →</Link>
      </div>
      <div className="mt-4 space-y-2">
        {mine.length === 0 && <p className="rounded-3xl border border-dashed p-8 text-center text-muted-foreground">No orders yet — add your first order.</p>}
        {mine.map((s) => (
          <Link key={s.id} to="/track" search={{ id: s.tracking_number }} className="flex items-center justify-between rounded-2xl border bg-card p-4">
            <div><p className="font-bold">{s.sender_city} → {s.receiver_city}</p><p className="font-mono text-xs text-muted-foreground">{s.tracking_number}</p></div>
            <div className="text-right"><span className="rounded-full bg-cream px-3 py-1 text-xs font-bold capitalize">{s.status.replaceAll("_", " ")}</span><p className="mt-1 text-sm font-bold">₹{s.price}</p></div>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
