import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { GeoHit } from "./geo";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

async function mapsRequest(path: string, opts: { body?: unknown; fieldMask?: string } = {}) {
  const key = process.env["GOOGLE_MAPS_API_KEY"], appKey = process.env["LOVABLE_API_KEY"];
  if (!key || !appKey) throw new Error("Google Maps is not configured.");
  const headers: Record<string, string> = { Authorization: `Bearer ${appKey}`, "X-Connection-Api-Key": key, "Content-Type": "application/json" };
  if (opts.fieldMask) headers["X-Goog-FieldMask"] = opts.fieldMask;
  const response = await fetch(`${GATEWAY_URL}/${path}`, { method: opts.body ? "POST" : "GET", headers, ...(opts.body ? { body: JSON.stringify(opts.body) } : {}) });
  if (response.status === 403) {
    const details: Array<{ reason?: string }> = (await response.json().catch(() => ({})))?.error?.details ?? [];
    const reason = details.find((d) => d.reason)?.reason;
    if (reason === "API_KEY_HTTP_REFERRER_BLOCKED") throw new Error("Google Maps server key is referrer-restricted; set its application restriction to None or IP addresses.");
    if (reason === "API_KEY_SERVICE_BLOCKED") throw new Error("Google Maps server key does not allow this API; add it to the key's allowed APIs.");
    throw new Error("Google Maps request was denied (403).");
  }
  if (!response.ok) { const t = await response.text(); console.error(`Maps request failed [${response.status}]: ${t}`); throw new Error(`Google Maps request failed (${response.status}).`); }
  return response.json();
}

type Comp = { types: string[]; longText?: string; long_name?: string };
const pick = (comps: Comp[] | undefined, ...types: string[]) => { for (const t of types) { const c = comps?.find((x) => x.types.includes(t)); if (c) return c.longText ?? c.long_name; } return undefined; };

// India-wide bias so results do not default to the gateway's location.
const INDIA_BIAS = { rectangle: { low: { latitude: 6.5, longitude: 68.0 }, high: { latitude: 35.7, longitude: 97.4 } } };

export const googlePlaceSearch = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((d: { q: string }) => z.object({ q: z.string().trim().min(3).max(120) }).parse(d))
  .handler(async ({ data }) => {
    const j = await mapsRequest("places/v1/places:searchText", {
      body: { textQuery: data.q, pageSize: 6, regionCode: "IN", languageCode: "en", locationBias: INDIA_BIAS },
      fieldMask: "places.id,places.formattedAddress,places.location,places.addressComponents",
    });
    const hits: GeoHit[] = [];
    for (const p of (j.places ?? []) as { location?: { latitude: number; longitude: number }; formattedAddress?: string; addressComponents?: Comp[] }[]) {
      if (!p.location) continue;
      let pincode = pick(p.addressComponents, "postal_code");
      // Some place results omit the postal code — fill it via reverse geocode.
      if (!pincode) { const r = await reverse(p.location.latitude, p.location.longitude).catch(() => null); pincode = r?.pincode; }
      hits.push({ lat: p.location.latitude, lng: p.location.longitude, label: p.formattedAddress ?? data.q, pincode, city: pick(p.addressComponents, "locality", "administrative_area_level_3", "administrative_area_level_2"), state: pick(p.addressComponents, "administrative_area_level_1") } as GeoHit);
    }
    return hits;
  });

async function reverse(lat: number, lng: number): Promise<GeoHit | null> {
  const j = await mapsRequest(`maps/api/geocode/json?latlng=${lat},${lng}&region=in`);
  const results = (j.results ?? []) as { formatted_address: string; address_components: Comp[] }[];
  const p = results[0]; if (!p) return null;
  const pincode = results.map((r) => pick(r.address_components, "postal_code")).find(Boolean);
  return { lat, lng, label: p.formatted_address, pincode, city: pick(p.address_components, "locality", "administrative_area_level_3", "administrative_area_level_2"), state: pick(p.address_components, "administrative_area_level_1") } as GeoHit;
}

export const googleReverse = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((d: { lat: number; lng: number }) => z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }).parse(d))
  .handler(async ({ data }) => reverse(data.lat, data.lng));
