import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { motion } from "framer-motion";
import { z } from "zod";
import { CircleDot, Loader2, PackageSearch } from "lucide-react";
import { SiteNav, MobileTabBar } from "@/components/site/SiteNav";
import { SiteFooter } from "@/components/site/SiteFooter";
import { supabase } from "@/integrations/supabase/client";
import { TrackAssistant } from "@/components/site/TrackAssistant";

export const Route = createFileRoute("/track")({
  validateSearch: (s) => z.object({ id: z.coerce.string().max(30).optional() }).parse(s),
  head: () => ({
    meta: [
      { title: "Track your parcel — Get Xpress" },
      { name: "description", content: "Enter your Get Xpress tracking ID to see live shipment status." },
      { property: "og:title", content: "Track your Get Xpress parcel" },
      { property: "og:description", content: "Live shipment status and scan history." },
    , { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }],
  }),
  component: Track,
});

type Result = { tracking_number: string; status: string; service: string; from_city: string; to_city: string; created_at: string; pieces: { code: string; seq: number; total: number }[]; events: { status: string; location: string | null; note: string | null; piece: string | null; at: string }[] } | null;

function Track() {
  const { id } = Route.useSearch();
  const navigate = useNavigate();
  const [val, setVal] = useState(id ?? "");
  const { data, isFetching } = useQuery({
    queryKey: ["track", id],
    enabled: !!id,
    refetchInterval: (q) => (q.state.data && (q.state.data as NonNullable<Result>).status !== "delivered" ? 15000 : false),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("track_shipment", { _tracking: id ?? "" });
      if (error) throw error;
      return data as Result;
    },
  });
  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <section className="bg-hero px-4 pb-16 pt-28 md:pt-40">
        <div className="mx-auto max-w-2xl">
          <h1 className="font-display text-5xl font-extrabold tracking-tight md:text-6xl">Where's my parcel?</h1>
          <form onSubmit={(e) => { e.preventDefault(); if (val.trim()) navigate({ to: "/track", search: { id: val.trim().toUpperCase() } }); }} className="mt-6 flex gap-2 rounded-[24px] bg-card p-2 shadow-soft">
            <input value={val} onChange={(e) => setVal(e.target.value)} placeholder="DBX1234567890" className="h-14 flex-1 rounded-2xl bg-transparent px-4 text-lg font-bold outline-none" />
            <button className="rounded-2xl bg-primary px-6 font-bold text-primary-foreground">Track</button>
          </form>
          <div className="mt-8">
            {isFetching && !data && <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />}
            {!isFetching && id && data === null && <div className="rounded-[28px] bg-card p-8 text-center"><PackageSearch className="mx-auto h-10 w-10 text-muted-foreground" /><p className="mt-3 font-bold">No shipment found for {id}</p></div>}
            {data && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-[32px] bg-card p-6 shadow-soft">
                <div className="flex items-start justify-between">
                  <div><p className="text-xs font-bold text-muted-foreground">{data.tracking_number}</p><p className="font-display text-2xl font-extrabold">{data.from_city} → {data.to_city}</p></div>
                  <span className="rounded-full bg-lime px-3 py-1 text-sm font-bold capitalize">{data.status.replace("_", " ")}</span>
                </div>
                {data.pieces.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {data.pieces.map((p) => (
                      <span key={p.code} className="rounded-full border px-3 py-1 font-mono text-xs font-bold">Parcel {p.seq}/{p.total} · {p.code}</span>
                    ))}
                  </div>
                )}
                <ol className="mt-6 space-y-5 border-l-2 border-primary/30 pl-6">
                  {data.events.map((e, i) => (
                    <li key={i} className="relative">
                      <CircleDot className={`absolute -left-[34px] top-0.5 h-5 w-5 bg-card ${i === 0 ? "text-primary" : "text-muted-foreground"}`} />
                      <p className="font-bold capitalize">{e.status.replace("_", " ")}</p>
                      <p className="text-sm text-muted-foreground">{[e.piece, e.location, e.note].filter(Boolean).join(" · ")}</p>
                      <p className="text-xs text-muted-foreground">{new Date(e.at).toLocaleString("en-IN")}</p>
                    </li>
                  ))}
                </ol>
              </motion.div>
            )}
            {data && <TrackAssistant tracking={data.tracking_number} />}
          </div>
        </div>
      </section>
      <SiteFooter />
      <MobileTabBar />
    </div>
  );
}
