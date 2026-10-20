import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { AppShell } from "@/components/site/AppShell";
import { createShipment } from "@/lib/shipments.functions";
import { quote, services, type ServiceLevel } from "@/lib/pricing";

export const Route = createFileRoute("/_authenticated/ship")({
  validateSearch: (s) => z.object({ from: z.coerce.string().optional(), to: z.coerce.string().optional(), kg: z.coerce.string().optional(), svc: z.enum(["standard", "express", "same_day"]).optional() }).parse(s),
  head: () => ({ meta: [{ title: "Book a pickup — DropBox" }, { name: "description", content: "Book a doorstep courier pickup." }, { property: "og:title", content: "Book a pickup — DropBox" }, { property: "og:description", content: "Book a doorstep courier pickup." }] }),
  component: Ship,
});

type Party = { name: string; phone: string; address: string; pincode: string; city: string };
const empty: Party = { name: "", phone: "", address: "", pincode: "", city: "" };
const partySchema = z.object({ name: z.string().trim().min(2, "Name required"), phone: z.string().regex(/^[6-9]\d{9}$/, "10-digit mobile"), address: z.string().trim().min(8, "Full address"), pincode: z.string().regex(/^\d{6}$/, "6-digit pincode"), city: z.string().trim().min(2, "City required") });

function Ship() {
  const s = Route.useSearch();
  const create = useServerFn(createShipment);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [sender, setSender] = useState<Party>({ ...empty, pincode: s.from ?? "" });
  const [receiver, setReceiver] = useState<Party>({ ...empty, pincode: s.to ?? "" });
  const [kg, setKg] = useState(s.kg ?? "1");
  const [svc, setSvc] = useState<ServiceLevel>(s.svc ?? "standard");
  const [contents, setContents] = useState("");
  const [value, setValue] = useState("0");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ tracking_number: string; price: number } | null>(null);

  const q = /^\d{6}$/.test(sender.pincode) && /^\d{6}$/.test(receiver.pincode) && Number(kg) > 0 ? quote({ fromPin: sender.pincode, toPin: receiver.pincode, weightKg: Number(kg), service: svc }) : null;

  const next = () => {
    const target = step === 0 ? sender : step === 1 ? receiver : null;
    if (target) { const r = partySchema.safeParse(target); if (!r.success) { toast.error(r.error.issues[0]?.message ?? "Check the form"); return; } }
    setStep(step + 1);
  };
  const submit = async () => {
    setBusy(true);
    try {
      const r = await create({ data: { service: svc, sender, receiver, weight_kg: Number(kg), contents, declared_value: Number(value) || 0 } });
      setDone(r);
      qc.invalidateQueries({ queryKey: ["my-shipments"] });
    } catch (e) { toast.error((e as Error).message); }
    setBusy(false);
  };

  if (done) return (
    <AppShell>
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="rounded-[32px] bg-card p-8 text-center shadow-soft">
        <CheckCircle2 className="mx-auto h-16 w-16 text-primary" />
        <h1 className="mt-4 font-display text-3xl font-extrabold">Pickup booked!</h1>
        <p className="mt-2 text-muted-foreground">Tracking ID</p>
        <p className="font-display text-3xl font-extrabold tracking-wider">{done.tracking_number}</p>
        <p className="mt-2 font-bold">Total ₹{done.price}</p>
        <div className="mt-6 flex gap-2">
          <button onClick={() => navigate({ to: "/track", search: { id: done.tracking_number } })} className="h-12 flex-1 rounded-2xl bg-ink font-bold text-ink-foreground">Track</button>
          <button onClick={() => navigate({ to: "/dashboard" })} className="h-12 flex-1 rounded-2xl border font-bold">My shipments</button>
        </div>
      </motion.div>
    </AppShell>
  );

  const titles = ["Pickup from", "Deliver to", "Parcel details", "Review & book"];
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
              <Input label="Weight (kg)" value={kg} onChange={setKg} inputMode="decimal" />
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
              <Row k="Billable weight" v={`${q.weight} kg (${q.zone})`} />
              <Row k="Freight" v={`₹${q.freight}`} />
              <Row k="GST 18%" v={`₹${q.gst}`} />
              <div className="flex justify-between border-t pt-3 font-display text-2xl font-extrabold"><span>Total</span><span>₹{q.total}</span></div>
              <p className="text-xs text-muted-foreground">Pay to the rider at pickup (online payment coming soon).</p>
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
    <label className="block rounded-2xl border bg-card px-4 py-2.5 focus-within:ring-2 focus-within:ring-ring">
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
      <div className="grid grid-cols-2 gap-3">
        <Input label="Pincode" value={v.pincode} onChange={(pincode) => set({ ...v, pincode: pincode.replace(/\D/g, "") })} inputMode="numeric" maxLength={6} />
        <Input label="City" value={v.city} onChange={(city) => set({ ...v, city })} />
      </div>
    </>
  );
}
