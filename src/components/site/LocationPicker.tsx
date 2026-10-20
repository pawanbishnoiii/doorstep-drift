import { ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense, useRef, useState } from "react";
import { Crosshair, Loader2, MapPin, Search } from "lucide-react";
import { reverseGeocode, searchPlaces, type GeoHit } from "@/lib/geo";

const LeafletMap = lazy(() => import("./LeafletMap"));

/**
 * Address search with OpenStreetMap suggestions, a draggable map pin and "use my location".
 * Calls onResolve with real coordinates + postcode/city from OSM; the caller validates the pincode against our master list.
 */
export function LocationPicker({ point, onResolve }: { point: { lat: number; lng: number } | null; onResolve: (hit: GeoHit) => void }) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<GeoHit[]>([]);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const t = useRef<ReturnType<typeof setTimeout>>(undefined);

  const search = (v: string) => {
    setQ(v);
    clearTimeout(t.current);
    if (v.trim().length < 3) return setHits([]);
    t.current = setTimeout(async () => { setBusy(true); try { setHits(await searchPlaces(v)); } catch { setHits([]); } setBusy(false); }, 450);
  };
  const pick = async (lat: number, lng: number) => { setBusy(true); const h = await reverseGeocode(lat, lng).catch(() => null); setBusy(false); onResolve(h ?? { lat, lng, label: `${lat.toFixed(5)}, ${lng.toFixed(5)}` }); };
  const locate = () => {
    if (!navigator.geolocation) return;
    setBusy(true);
    navigator.geolocation.getCurrentPosition((p) => { setOpen(true); pick(p.coords.latitude, p.coords.longitude); }, () => setBusy(false), { enableHighAccuracy: true, timeout: 10000 });
  };

  return (
    <div className="rounded-2xl border bg-card p-3">
      <div className="flex gap-2">
        <label className="relative flex h-11 flex-1 items-center gap-2 rounded-xl border bg-background px-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={(e) => search(e.target.value)} placeholder="Search area, landmark, society…" className="flex-1 bg-transparent text-sm font-semibold outline-none" />
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {hits.length > 0 && (
            <div className="absolute left-0 top-12 z-[1000] max-h-64 w-full overflow-auto rounded-xl border bg-card shadow-soft">
              {hits.map((h, i) => (
                <button key={i} type="button" onClick={() => { setHits([]); setQ(h.label.split(",").slice(0, 2).join(",")); setOpen(true); onResolve(h); }} className="flex w-full items-start gap-2 px-3 py-2 text-left text-xs hover:bg-muted">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" /><span>{h.label}{h.pincode && <b className="ml-1 font-mono">{h.pincode}</b>}</span>
                </button>
              ))}
            </div>
          )}
        </label>
        <button type="button" onClick={locate} aria-label="Use my location" className="grid h-11 w-11 place-items-center rounded-xl bg-ink text-ink-foreground"><Crosshair className="h-4 w-4" /></button>
        <button type="button" onClick={() => setOpen(!open)} className="h-11 rounded-xl border px-3 text-xs font-bold">{open ? "Hide map" : "Map"}</button>
      </div>
      {open && (
        <div className="mt-3">
          <ClientOnly fallback={<div className="h-64 animate-pulse rounded-2xl bg-muted" />}>
            <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-muted" />}>
              <LeafletMap lat={point?.lat ?? 26.9124} lng={point?.lng ?? 75.7873} onPick={pick} />
            </Suspense>
          </ClientOnly>
          <p className="mt-1 text-[11px] text-muted-foreground">Tap the map or drag the pin. Map data © OpenStreetMap contributors.</p>
        </div>
      )}
    </div>
  );
}
