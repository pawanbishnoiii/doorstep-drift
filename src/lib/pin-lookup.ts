import { supabase } from "@/integrations/supabase/client";
import { searchPlaces } from "./geo";

/** Pincode + locality suggestions. Reads the public pincode master straight from the browser with an in-memory cache. */
export type PinHit = { pincode: string; city: string; state: string; zone?: string | null; source: "master" | "map"; lat?: number; lng?: number; label?: string };

const cache = new Map<string, PinHit[]>();

export async function lookupPins(raw: string): Promise<PinHit[]> {
  const q = raw.trim();
  if (q.length < 2) return [];
  const key = q.toLowerCase();
  const hit = cache.get(key);
  if (hit) return hit;
  // Reuse a cached shorter prefix result when it is already narrow
  for (let i = key.length - 1; i >= 2; i--) {
    const prev = cache.get(key.slice(0, i));
    if (prev && prev.length < 12 && prev.every((p) => p.source === "master")) {
      const f = prev.filter((p) => (/^\d+$/.test(q) ? p.pincode.startsWith(q) : p.city.toLowerCase().includes(key)));
      if (f.length) { cache.set(key, f); return f; }
      break;
    }
  }
  const isPin = /^\d+$/.test(q);
  const base = supabase.from("pincodes").select("pincode,city,state,zone").eq("active", true).limit(12);
  const { data } = isPin ? await base.like("pincode", `${q}%`).order("pincode") : await base.ilike("city", `${q.replace(/[%_]/g, "")}%`).order("city");
  let rows: PinHit[] = (data ?? []).map((r) => ({ ...r, source: "master" as const }));
  // Locality names (e.g. "Malviya Nagar") are not in the master list — ask the free map for them
  if (!isPin && rows.length < 4 && q.length >= 3) {
    const places = await searchPlaces(q).catch(() => []);
    rows = rows.concat(places.flatMap((p) => p.pincode && /^\d{6}$/.test(p.pincode) ? [{ pincode: p.pincode, city: p.city ?? "", state: p.state ?? "", source: "map" as const, lat: p.lat, lng: p.lng, label: p.label }] : []));
  }
  cache.set(key, rows);
  return rows;
}

/** Exact pincode check against the serviceable master list. */
export async function pinInfo(pin: string): Promise<PinHit | null> {
  if (!/^\d{6}$/.test(pin)) return null;
  const rows = await lookupPins(pin);
  return rows.find((r) => r.pincode === pin && r.source === "master") ?? null;
}
