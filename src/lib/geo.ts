/** Free OpenStreetMap (Nominatim) geocoding, called from the browser only. No API key needed. */
export type GeoHit = { lat: number; lng: number; label: string; pincode?: string; city?: string; state?: string };

const BASE = "https://nominatim.openstreetmap.org";

type NomAddr = { postcode?: string; city?: string; town?: string; village?: string; suburb?: string; state_district?: string; county?: string; state?: string };
const toHit = (r: { lat: string; lon: string; display_name: string; address?: NomAddr }): GeoHit => ({
  lat: Number(r.lat), lng: Number(r.lon), label: r.display_name,
  pincode: r.address?.postcode?.replace(/\s/g, "").slice(0, 6),
  city: r.address?.city ?? r.address?.town ?? r.address?.village ?? r.address?.state_district ?? r.address?.county,
  state: r.address?.state,
});

export async function searchPlaces(q: string): Promise<GeoHit[]> {
  const res = await fetch(`${BASE}/search?format=jsonv2&addressdetails=1&countrycodes=in&limit=6&q=${encodeURIComponent(q)}`, { headers: { "Accept-Language": "en" } });
  if (!res.ok) return [];
  return ((await res.json()) as Parameters<typeof toHit>[0][]).map(toHit);
}

export async function reverseGeocode(lat: number, lng: number): Promise<GeoHit | null> {
  const res = await fetch(`${BASE}/reverse?format=jsonv2&addressdetails=1&lat=${lat}&lon=${lng}`, { headers: { "Accept-Language": "en" } });
  if (!res.ok) return null;
  const j = await res.json();
  return j?.lat ? toHit(j) : null;
}

export async function geocodePincode(pin: string, city?: string): Promise<GeoHit | null> {
  const res = await fetch(`${BASE}/search?format=jsonv2&addressdetails=1&countrycodes=in&limit=1&postalcode=${pin}`, { headers: { "Accept-Language": "en" } });
  const j = res.ok ? await res.json() : [];
  if (j[0]) return toHit(j[0]);
  if (city) return (await searchPlaces(`${city}, India`))[0] ?? null;
  return null;
}
