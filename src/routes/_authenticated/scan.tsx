import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, CheckCircle2, Loader2, ScanLine } from "lucide-react";
import { AppShell } from "@/components/site/AppShell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/scan")({
  head: () => ({ meta: [{ title: "Scan parcel — DropBox" }, { name: "description", content: "Scan a parcel barcode or QR to update its status." }] }),
  component: Scan,
});

const STATUSES = ["picked_up", "in_transit", "at_hub", "out_for_delivery", "delivered", "exception"] as const;

function Scan() {
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("picked_up");
  const [location, setLocation] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [camOn, setCamOn] = useState(false);
  const [result, setResult] = useState<{ awb: string; piece: string | null; status: string } | null>(null);
  const scannerRef = useRef<{ stop: () => Promise<void> } | null>(null);

  useEffect(() => () => { scannerRef.current?.stop().catch(() => {}); }, []);

  const startCam = async () => {
    setCamOn(true);
    const { Html5Qrcode } = await import("html5-qrcode");
    const sc = new Html5Qrcode("scan-box");
    scannerRef.current = sc;
    try {
      await sc.start({ facingMode: "environment" }, { fps: 8, qrbox: { width: 220, height: 160 } }, (text) => {
        setCode(text.trim().toUpperCase());
        toast.success("Code captured");
        sc.stop().catch(() => {}); setCamOn(false);
      }, () => {});
    } catch { toast.error("Camera not available — type the code instead."); setCamOn(false); }
  };

  const submit = async () => {
    if (!code.trim()) return;
    setBusy(true); setResult(null);
    const { data, error } = await supabase.rpc("scan_piece", { _code: code.trim(), _status: status, ...(location.trim() ? { _location: location.trim() } : {}), ...(note.trim() ? { _note: note.trim() } : {}) });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setResult(data as { awb: string; piece: string | null; status: string });
    setCode("");
  };

  return (
    <AppShell>
      <h1 className="font-display text-3xl font-extrabold">Scan a parcel</h1>
      <p className="text-muted-foreground">Scan the piece barcode/QR or type the AWB / piece ID.</p>

      <div id="scan-box" className={`mt-4 overflow-hidden rounded-3xl ${camOn ? "min-h-64 border" : "hidden"}`} />
      <button onClick={startCam} className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-2xl border bg-card font-bold">
        <Camera className="h-5 w-5" /> {camOn ? "Scanning… point at the label" : "Open camera scanner"}
      </button>

      <div className="mt-4 space-y-3">
        <label className="block rounded-2xl border bg-card px-4 py-2.5">
          <span className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">AWB or piece ID</span>
          <div className="flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-muted-foreground" />
            <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="DBXP00000000001" className="w-full bg-transparent font-mono text-base font-bold outline-none" />
          </div>
        </label>
        <div className="grid grid-cols-2 gap-2">
          {STATUSES.map((st) => (
            <button key={st} onClick={() => setStatus(st)} className={`rounded-2xl border p-3 text-sm font-bold capitalize ${status === st ? "border-primary bg-primary/5 ring-2 ring-primary" : "bg-card"}`}>{st.replaceAll("_", " ")}</button>
          ))}
        </div>
        <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location (e.g. Jaipur hub)" className="h-12 w-full rounded-2xl border bg-card px-4 font-semibold outline-none" />
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" className="h-12 w-full rounded-2xl border bg-card px-4 font-semibold outline-none" />
        <button onClick={submit} disabled={busy || !code.trim()} className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary font-bold text-primary-foreground disabled:opacity-40">
          {busy && <Loader2 className="h-5 w-5 animate-spin" />} Record scan
        </button>
      </div>

      {result && (
        <div className="mt-5 flex items-center gap-3 rounded-3xl bg-lime/40 p-4">
          <CheckCircle2 className="h-8 w-8 text-primary" />
          <div>
            <p className="font-bold">Saved: {result.status.replaceAll("_", " ")}</p>
            <p className="text-sm text-muted-foreground">{result.awb}{result.piece ? ` · ${result.piece}` : ""}</p>
          </div>
        </div>
      )}
    </AppShell>
  );
}
