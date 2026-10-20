export type ServiceLevel = "standard" | "express" | "same_day";

export const services: Record<ServiceLevel, { label: string; eta: string; base: number; perKg: number }> = {
  standard: { label: "Standard", eta: "3–5 days", base: 49, perKg: 30 },
  express: { label: "Express", eta: "1–2 days", base: 89, perKg: 55 },
  same_day: { label: "Same day (intra-city)", eta: "Today", base: 149, perKg: 70 },
};

/** Billable weight = max(actual, volumetric L*W*H/5000), rounded up to 0.5 kg. */
export function billableWeight(actualKg: number, dims?: { l: number; w: number; h: number }) {
  const vol = dims ? (dims.l * dims.w * dims.h) / 5000 : 0;
  const w = Math.max(actualKg, vol, 0.5);
  return Math.ceil(w * 2) / 2;
}

/** Zone surcharge from pincode distance: same first 3 digits = local, same first digit = regional, else national. */
export function zoneOf(fromPin: string, toPin: string): "local" | "regional" | "national" {
  if (fromPin.slice(0, 3) === toPin.slice(0, 3)) return "local";
  if (fromPin[0] === toPin[0]) return "regional";
  return "national";
}

const zoneMultiplier = { local: 1, regional: 1.25, national: 1.6 } as const;

export function quote(params: { fromPin: string; toPin: string; weightKg: number; service: ServiceLevel; dims?: { l: number; w: number; h: number } }) {
  const s = services[params.service];
  const weight = billableWeight(params.weightKg, params.dims);
  const zone = zoneOf(params.fromPin, params.toPin);
  const freight = (s.base + s.perKg * Math.max(0, weight - 0.5)) * zoneMultiplier[zone];
  const gst = freight * 0.18;
  return { weight, zone, freight: round(freight), gst: round(gst), total: round(freight + gst), eta: s.eta };
}

const round = (n: number) => Math.round(n * 100) / 100;

export type CouponRule = { discount_type: string; discount_value: number; max_discount: number | null; min_order: number };

/** Discount for a coupon on an order total; 0 when the order is below the minimum. */
export function couponDiscount(total: number, c: CouponRule) {
  if (total < c.min_order) return 0;
  let d = c.discount_type === "percent" ? (total * c.discount_value) / 100 : c.discount_value;
  if (c.max_discount != null) d = Math.min(d, c.max_discount);
  return round(Math.min(d, total));
}
