import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, Plus, Trash2 } from "lucide-react";
import { AppShell } from "@/components/site/AppShell";
import { createShipment } from "@/lib/shipments.functions";
import { searchPincodes } from "@/lib/pincodes.functions";
import { quote, services, type ServiceLevel } from "@/lib/pricing";

export const Route = createFileRoute("/_authenticated/ship")({
  validateSearch: (s) => z.object({ from: z.coerce.string().optional(), to: z.coerce.string().optional(), kg: z.coerce.string().optional(), svc: z.enum(["standard", "express", "same_day"]).optional() }).parse(s),
  head: () => ({ meta: [{ title: "Book a pickup — DropBox" }, { name: "description", content: "Book a doorstep courier pickup." }, { property: "og:title", content: "Book a pickup — DropBox" }, { property: "og:description", content: "Book a doorstep courier pickup." }] }),
  component: Ship,
});

type Party = { name: string; phone: string; address: string; pincode: string; city: string };
const empty: Party = { name: "", phone: "", address: "", pincode: "", city: "" };
const partySchema = z.object({ name: z.string().trim().min(2, "Name required"), phone: z.string().regex(/^[6-9]\d{9}$/, "10-digit mobile"), address: z.string().trim().min(8, "Full address"), pincode: z.string().regex(/^\d{6}$/, "6-digit pincode"), city: z.string().trim().min(2, "City required") });

type PinSuggestion = { pincode: string; city: string; state: string };

function PincodeInput({ value, onPick }: { value: string; onPick: (pincode: string, city: string) => void }) {
  const search = useServerFn(searchPincodes);
  const [suggest, setSuggest] = useState<PinSuggestion[]>([]);
  return (
    <div className="relative">
      <label className="block rounded-2xl border bg-card px-4 py-2.5 focus-within:ring-2 focus-within:ring-ring">
        <span className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Pincode</span>
        <input value={value} inputMode="numeric" maxLength={6} className="w-full bg-transparent text-base font-semibold outline-none"
          onChange={async (e) => {
            const v = e.target.value.replace(/\D/g, "");
            onPick(v, "");
            if (v.length >= 2) { try { setSuggest(await search({ data: { q: v } }) as PinSuggestion[]); } catch { setSuggest([]); } }
            else setSuggest([]);
          }} />
      </label>
      {suggest.length > 0 && (
        <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-2xl border bg-card shadow-soft">
          {suggest.map((s) => (
            <button key={s.pincode} type="button" onClick={() => { onPick(s.pincode, s.city); setSuggest([]); }} className="block w-full px-4 py-2.5 text-left text-sm hover:bg-muted">
              <span className="font-mono font-bold">{s.pincode}</span> <span className="text-muted-foreground">{s.city}, {s.state}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Ship() {
  const s = Route.useSearch();
  const create = useServerFn(createShipment);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [sender, setSender] = useState<Party>({ ...empty, pincode: s.from ?? "" });
  const [receiver, setReceiver] = useState<Party>({ ...empty, pincode: s.to ?? "" });
  const [weights, setWeights] = useState<string[]>([s.kg ?? "1"]);
  const [svc, setSvc] = useState<ServiceLevel>(s.svc ?? "standard");
  const [contents, setContents] = useState("");
  const [value, setValue] = useState("0");
  const [pay, setPay] = useState<"cash_on_pickup" | "online">("cash_on_pickup");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ id: string; tracking_number: string; price: number; status: string } | null>(null);

  const totalKg = weights.reduce((a, w) => a + (Number(w) || 0), 0);
  const q = /^\d{6}$/.test(sender.pincode) && /^\d{6}$/.test(receiver.pincode) && totalKg > 0 ? quote({ fromPin: sender.pincode, toPin: receiver.pincode, weightKg: totalKg, service: svc }) : null;

  const next = () => {
    const target = step === 0 ? sender : step === 1 ? receiver : null;
    if (target) { const r = partySchema.safeParse(target); if (!r.success) { toast.error(r.error.issues[0]?.message ?? "Check the form"); return; } }
    setStep(step + 1);
  };
  const submit = async () => {
    setBusy(true);
    try {
      const r = await create({ data: { service: svc, sender, receiver, pieces: weights.map((w) => ({ weight_kg: Number(w) || 0.5 })), contents, declared_value: Number(value) || 0, payment_method: pay } });
      setDone(r);
      qc.invalidateQueries({ queryKey: ["my-shipments"] });
    } catch (e) { toast.error((e as Error).message); }
    setBusy(false);
  };

  if (done) return (
    <AppShell>
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="rounded-[32px] bg-card p-8 text-center shadow-soft">
        <CheckCircle2 className="mx-auto h-16 w-16 text-primary" />
        <h1 className="mt-4 font-display text-3xl font-extrabold">{done.status === "awaiting_payment" ? "Payment pending" : "Pickup booked!"}</h1>
        <p className="mt-2 text-muted-foreground">Master AWB</p>
        <p className="font-display text-3xl font-extrabold tracking-wider">{done.tracking_number}</p>
        <p className="mt-2 font-bold">Total ₹{done.price} · {weights.length} parcel{weights.length > 1 ? "s" : ""}</p>
        {done.status === "awaiting_payment" && (
          <p className="mt-3 rounded-2xl bg-amber-50 p-3 text-sm font-semibold text-amber-900">Online payment gateway is not connected yet. Your booking is saved — switch to pay-at-pickup from My shipments to confirm it.</p>
        )}
        <div className="mt-6 flex gap-2">
          {done.status !== "awaiting_payment" && (
            <button onClick={() => navigate({ to: "/labels/$shipmentId", params: { shipmentId: done.id } })} className="h-12 flex-1 rounded-2xl bg-primary font-bold text-primary-foreground">Print labels</button>
          )}
          <button onClick={() => navigate({ to: "/track", search: { id: done.tracking_number } })} className="h-12 flex-1 rounded-2xl bg-ink font-bold text-ink-foreground">Track</button>
          <button onClick={() => navigate({ to: "/dashboard" })} className="h-12 flex-1 rounded-2xl border font-bold">My shipments</button>
        </div>
      </motion.div>
    </AppShell>
  );

  const titles = ["Pickup from", "Deliver to", "Parcels & service", "Review & book"];
  return (
    <AppShell>
      <div className="mb-5 flex gap-1.5">{titles.map((_, i) => <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-muted"}`} />)}</div>
      <h1 className="font-display text-3xl font-extrabold">{titles[step]}</h1>
      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} className="mt-5 space-y-3">
          {step === 0 && <PartyForm v={sender} set={setSender} />}
          {step === 1 && <PartyForm v={receiver} set={setReceiver} />}
          {step === 2 && (
            <>
              <p className="text-sm font-bold text-muted-foreground">Each physical parcel gets its own barcode & tracking ID.</p>
              {weights.map((w, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input label={`Parcel ${i + 1} weight (kg)`} value={w} inputMode="decimal"
                    onChange={(v) => setWeights(weights.map((x, j) => (j === i ? v : x)))} />
                  {weights.length > 1 && (
                    <button onClick={() => setWeights(weights.filter((_, j) => j !== i))} className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border bg-card"><Trash2 className="h-4 w-4" /></button>
                  )}
                </div>
              ))}
              {weights.length < 50 && (
                <button onClick={() => setWeights([...weights, "1"])} className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-dashed font-bold text-muted-foreground"><Plus className="h-4 w-4" /> Add another parcel</button>
              )}
              <Input label="What's inside?" value={contents} onChange={setContents} />
              <Input label="Declared value (₹)" value={value} onChange={setValue} inputMode="numeric" />
              <div className="grid gap-2">
                {(Object.keys(services) as ServiceLevel[]).map((k) => (
                  <button key={k} onClick={() => setSvc(k)} className={`flex items-center justify-between rounded-2xl border p-4 text-left ${svc === k ? "border-primary bg-primary/5 ring-2 ring-primary" : "bg-card"}`}>
                    <span className="font-bold">{services[k].label}</span><span className="text-sm text-muted-foreground">{services[k].eta}</span>
                  </button>
                ))}
              </div>
            </>
          )}
          {step === 3 && q && (
            <div className="space-y-3 rounded-[28px] bg-card p-5 shadow-soft">
              <Row k="From" v={`${sender.name}, ${sender.city} ${sender.pincode}`} />
              <Row k="To" v={`${receiver.name}, ${receiver.city} ${receiver.pincode}`} />
              <Row k="Service" v={`${services[svc].label} · ${q.eta}`} />
              <Row k="Parcels" v={`${weights.length} × (${weights.join(" + ")} kg)`} />
              <Row k="Billable weight" v={`${q.weight} kg (${q.zone})`} />
              <Row k="Freight" v={`₹${q.freight}`} />
              <Row k="GST 18%" v={`₹${q.gst}`} />
              <div className="flex justify-between border-t pt-3 font-display text-2xl font-extrabold"><span>Total</span><span>₹{q.total}</span></div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button onClick={() => setPay("cash_on_pickup")} className={`rounded-2xl border p-3 text-left text-sm font-bold ${pay === "cash_on_pickup" ? "border-primary bg-primary/5 ring-2 ring-primary" : ""}`}>Pay at pickup<span className="block text-xs font-semibold text-muted-foreground">Cash / UPI to rider</span></button>
                <button onClick={() => setPay("online")} className={`rounded-2xl border p-3 text-left text-sm font-bold ${pay === "online" ? "border-primary bg-primary/5 ring-2 ring-primary" : ""}`}>Pay online<span className="block text-xs font-semibold text-muted-foreground">Gateway coming soon</span></button>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
      <div className="mt-6 flex gap-2">
        {step > 0 && <button onClick={() => setStep(step - 1)} className="grid h-14 w-14 place-items-center rounded-2xl border bg-card"><ArrowLeft className="h-5 w-5" /></button>}
        {step < 3 ? (
          <button onClick={next} className="flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-primary font-bold text-primary-foreground">Continue <ArrowRight className="h-5 w-5" /></button>
        ) : (
          <button onClick={submit} disabled={busy || !q} className="flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-ink font-bold text-ink-foreground">{busy && <Loader2 className="h-5 w-5 animate-spin" />} Book pickup · ₹{q?.total}</button>
        )}
      </div>
    </AppShell>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between gap-4 text-sm"><span className="text-muted-foreground">{k}</span><span className="text-right font-semibold">{v}</span></div>;
}

function Input({ label, value, onChange, ...rest }: { label: string; value: string; onChange: (v: string) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value">) {
  return (
    <label className="block w-full rounded-2xl border bg-card px-4 py-2.5 focus-within:ring-2 focus-within:ring-ring">
      <span className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
      <input {...rest} value={value} onChange={(e) => onChange(e.target.value)} className="w-full bg-transparent text-base font-semibold outline-none" />
    </label>
  );
}

function PartyForm({ v, set }: { v: Party; set: (p: Party) => void }) {
  return (
    <>
      <Input label="Full name" value={v.name} onChange={(name) => set({ ...v, name })} />
      <Input label="Mobile" value={v.phone} onChange={(phone) => set({ ...v, phone: phone.replace(/\D/g, "") })} inputMode="numeric" maxLength={10} />
      <Input label="Address" value={v.address} onChange={(address) => set({ ...v, address })} />
      <div className="grid grid-cols-2 items-start gap-3">
        <PincodeInput value={v.pincode} onPick={(pincode, city) => set({ ...v, pincode, city: city || v.city })} />
        <Input label="City" value={v.city} onChange={(city) => set({ ...v, city })} />
      </div>
    </>
  );
}
