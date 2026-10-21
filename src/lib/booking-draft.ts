import { z } from "zod";
export const DRAFT_KEY = "getxpress_booking_draft_v1";
const party = z.object({ name: z.string(), phone: z.string(), address: z.string(), pincode: z.string(), city: z.string(), lat: z.number().optional(), lng: z.number().optional() });
const piece = z.object({ id: z.string(), preset: z.string(), kind: z.enum(["documents", "packages"]), weight_kg: z.number(), dims: z.object({ l: z.number(), w: z.number(), h: z.number() }) });
export const draftSchema = z.object({ sender: party, receiver: party, pieces: z.array(piece).min(1).max(50), service: z.enum(["standard", "express", "same_day"]), contents: z.string(), declared_value: z.number(), coupon: z.string(), payment_method: z.enum(["cash_on_pickup", "online"]), step: z.number().min(0).max(3) });
export type BookingDraft = z.infer<typeof draftSchema>;
export const emptyParty = { name: "", phone: "", address: "", pincode: "", city: "" };
export function newPiece() { return { id: crypto.randomUUID(), preset: "small", kind: "packages" as const, weight_kg: 1, dims: { l: 25, w: 20, h: 10 } }; }
export function initialDraft(): BookingDraft { return { sender: { ...emptyParty }, receiver: { ...emptyParty }, pieces: [newPiece()], service: "standard", contents: "", declared_value: 0, coupon: "", payment_method: "cash_on_pickup", step: 0 }; }
export function readDraft(storage: Pick<Storage, "getItem">): BookingDraft | null { try { const r = draftSchema.safeParse(JSON.parse(storage.getItem(DRAFT_KEY) ?? "null")); return r.success ? r.data : null; } catch { return null; } }
export function saveDraft(storage: Pick<Storage, "setItem">, draft: BookingDraft) { storage.setItem(DRAFT_KEY, JSON.stringify(draftSchema.parse(draft))); }