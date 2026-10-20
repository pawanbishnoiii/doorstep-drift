import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { PackagePlus, PackageSearch, Truck } from "lucide-react";
import { AppShell } from "@/components/site/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/use-profile";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "My shipments — DropBox" }, { name: "description", content: "Your DropBox shipments." }, { property: "og:title", content: "My shipments — DropBox" }, { property: "og:description", content: "Your DropBox shipments." }] }),
  component: Dashboard,
});

function Dashboard() {
  const { data: me } = useProfile();
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["my-shipments"],
    queryFn: async () => {
      const { data, error } = await supabase.from("shipments").select("id,tracking_number,status,receiver_city,sender_city,price,created_at,service").eq("user_id", me!.user.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!me?.user,
  });
  const name = (me?.user.user_metadata?.["full_name"] as string | undefined)?.split(" ")[0] ?? "there";
  return (
    <AppShell>
      <h1 className="font-display text-4xl font-extrabold tracking-tight">Hi {name} 👋</h1>
      <p className="text-muted-foreground">What are we sending today?</p>
      <div className="mt-6 grid grid-cols-2 gap-3">
        <Link to="/ship" className="rounded-[28px] bg-primary p-5 text-primary-foreground shadow-glow"><PackagePlus className="h-7 w-7" /><p className="mt-6 font-display text-xl font-extrabold">Book pickup</p></Link>
        <Link to="/track" className="rounded-[28px] bg-lime p-5 text-ink"><PackageSearch className="h-7 w-7" /><p className="mt-6 font-display text-xl font-extrabold">Track parcel</p></Link>
      </div>
      <h2 className="mt-10 font-display text-2xl font-extrabold">Your shipments</h2>
      <div className="mt-4 space-y-3">
        {isLoading && <div className="h-20 animate-pulse rounded-3xl bg-muted" />}
        {!isLoading && rows.length === 0 && (
          <div className="rounded-[28px] border border-dashed p-10 text-center text-muted-foreground"><Truck className="mx-auto h-10 w-10" /><p className="mt-3 font-semibold">No shipments yet — book your first pickup.</p></div>
        )}
        {rows.map((s, i) => (
          <motion.div key={s.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Link to="/track" search={{ id: s.tracking_number }} className="flex items-center justify-between rounded-3xl border bg-card p-4">
              <div>
                <p className="font-bold">{s.sender_city} → {s.receiver_city}</p>
                <p className="text-xs text-muted-foreground">{s.tracking_number} · {new Date(s.created_at).toLocaleDateString("en-IN")}</p>
              </div>
              <div className="text-right">
                <span className="rounded-full bg-cream px-3 py-1 text-xs font-bold capitalize">{s.status.replace("_", " ")}</span>
                <p className="mt-1 text-sm font-bold">₹{s.price}</p>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </AppShell>
  );
}
