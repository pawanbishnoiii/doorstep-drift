import { useEffect, useRef, useState } from "react";
import { Loader2, MapPin, CheckCircle2 } from "lucide-react";
import { lookupPins, type PinHit } from "@/lib/pin-lookup";

/** Pincode / city / locality box with instant suggestions from the pincode master and OpenStreetMap. */
export function PinAutocomplete({ label, value, city, onChange, onPick, compact = false }: {
  label: string; value: string; city?: string | undefined; compact?: boolean;
  onChange: (v: string) => void; onPick: (h: PinHit) => void;
}) {
  const [text, setText] = useState(value);
  const [hits, setHits] = useState<PinHit[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState(0);
  const seq = useRef(0);
  useEffect(() => { setText(value); }, [value]);

  useEffect(() => {
    if (!open) return;
    const q = text.trim();
    if (q.length < 2) { setHits([]); return; }
    const my = ++seq.current;
    const t = setTimeout(async () => {
      setBusy(true);
      const r = await lookupPins(q).catch(() => []);
      if (my === seq.current) { setHits(r); setActive(0); setBusy(false); }
    }, /^\d+$/.test(q) ? 90 : 220);
    return () => clearTimeout(t);
  }, [text, open]);

  const pick = (h: PinHit) => { setText(h.pincode); onChange(h.pincode); onPick(h); setOpen(false); };
  const ok = /^\d{6}$/.test(value) && !!city;

  return (
    <div className="relative">
      <label className={`block rounded-2xl border bg-card px-3 focus-within:ring-2 focus-within:ring-ring ${compact ? "py-2" : "py-2.5"}`}>
        <span className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}{busy ? <Loader2 className="h-3 w-3 animate-spin" /> : ok ? <CheckCircle2 className="h-3.5 w-3.5 text-success" /> : null}</span>
        <input value={text} placeholder="Pincode or city" autoComplete="off"
          onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (!hits.length) return;
            if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, hits.length - 1)); }
            if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
            if (e.key === "Enter" && open) { e.preventDefault(); pick(hits[active]!); }
          }}
          onChange={(e) => { const v = e.target.value.slice(0, 40); setText(v); setOpen(true); onChange(/^\d+$/.test(v) ? v.slice(0, 6) : ""); }}
          className="w-full bg-transparent text-base font-bold text-ink outline-none placeholder:font-medium placeholder:text-muted-foreground/60" />
        {city && !compact && <span className="block truncate text-xs text-muted-foreground">{city}</span>}
      </label>
      {open && hits.length > 0 && (
        <div className="absolute z-50 mt-1 max-h-72 w-full min-w-[260px] overflow-auto rounded-2xl border bg-popover p-1 text-popover-foreground shadow-soft">
          {hits.map((h, i) => (
            <button key={`${h.source}-${h.pincode}-${i}`} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => pick(h)}
              className={`flex w-full items-start gap-2 rounded-xl px-3 py-2 text-left text-sm ${i === active ? "bg-muted" : ""}`}>
              <MapPin className={`mt-0.5 h-4 w-4 shrink-0 ${h.source === "map" ? "text-accent-foreground" : "text-primary"}`} />
              <span className="min-w-0">
                <span className="font-mono font-bold">{h.pincode}</span> <span className="font-semibold">{h.city}</span>
                <span className="block truncate text-xs text-muted-foreground">{h.source === "map" ? h.label : `${h.state}${h.zone ? ` · ${h.zone}` : ""}`}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
