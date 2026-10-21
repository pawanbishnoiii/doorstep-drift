import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { LocateFixed, Loader2 } from "lucide-react";
import { AppShell, PageHeader } from "@/components/site/AppShell";
import { PinAutocomplete } from "@/components/site/PinAutocomplete";
import { Button } from "@/components/ui/button";
import { useProfile } from "@/hooks/use-profile";
import { supabase } from "@/integrations/supabase/client";
import { validateOnboarding } from "@/lib/onboarding";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({ meta: [{ title: "Complete your profile — Get Xpress" }, { name: "description", content: "Add your name, gender, age and pickup address." }, { property: "og:title", content: "Complete your Get Xpress profile" }, { property: "og:description", content: "Profile setup for Get Xpress." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Onboarding,
});

function Onboarding() {
  const { data } = useProfile();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const p = data?.profile;
  const [f, setF] = useState({ full_name: "", gender: "", age: "", address: "", pincode: "", city: "" });
  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);
  useEffect(() => {
    if (p) setF({ full_name: p.full_name ?? "", gender: p.gender ?? "", age: p.age ? String(p.age) : "", address: p.address ?? "", pincode: p.pincode ?? "", city: p.city ?? "" });
  }, [p]);
  const set = (k: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [k]: v }));

  const locate = () => {
    if (!navigator.geolocation) { toast.error("Location not supported on this device."); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const g = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setGeo(g);
      try {
        const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${g.lat}&lon=${g.lng}`);
        const j = await r.json();
        const a = j.address ?? {};
        setF((x) => ({ ...x, address: j.display_name ?? x.address, pincode: a.postcode?.replace(/\D/g, "").slice(0, 6) || x.pincode, city: a.city || a.town || a.village || a.state_district || x.city }));
      } catch { /* keep coordinates only */ }
      setLocating(false);
    }, () => { setLocating(false); toast.error("Allow location access, or type your address."); }, { enableHighAccuracy: true, timeout: 10000 });
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateOnboarding({ ...f, age: Number(f.age) });
    if (err) { toast.error(err); return; }
    setBusy(true);
    const { error } = await supabase.from("profiles").update({
      full_name: f.full_name.trim(), gender: f.gender, age: Number(f.age), address: f.address.trim(), pincode: f.pincode, city: f.city || null,
      lat: geo?.lat ?? null, lng: geo?.lng ?? null, onboarded_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }).eq("id", data!.user.id);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Profile saved");
    await qc.invalidateQueries({ queryKey: ["profile"] });
    navigate({ to: "/dashboard" });
  };

  const input = "mt-1 h-12 w-full rounded-xl border bg-card px-4";
  return (
    <AppShell skipOnboarding>
      <PageHeader title="Complete your profile" sub={`Signed in as +91 ${p?.phone ?? ""}`} />
      <form onSubmit={save} className="grid max-w-2xl gap-4">
        <label className="text-sm font-semibold">Full name<input required value={f.full_name} onChange={(e) => set("full_name")(e.target.value)} className={input} /></label>
        <div className="grid grid-cols-2 gap-4">
          <label className="text-sm font-semibold">Gender
            <select required value={f.gender} onChange={(e) => set("gender")(e.target.value)} className={input}>
              <option value="">Select</option><option value="female">Female</option><option value="male">Male</option><option value="other">Other</option>
            </select>
          </label>
          <label className="text-sm font-semibold">Age<input required type="number" min={13} max={100} value={f.age} onChange={(e) => set("age")(e.target.value)} className={input} /></label>
        </div>
        <Button type="button" variant="outline" className="h-12" onClick={locate} disabled={locating}>{locating ? <Loader2 className="animate-spin" /> : <LocateFixed />} Use my current location</Button>
        {geo && <p className="text-xs text-muted-foreground">Location saved: {geo.lat.toFixed(5)}, {geo.lng.toFixed(5)}</p>}
        <div className="text-sm font-semibold">Pincode
          <PinAutocomplete value={f.pincode} onChange={set("pincode")} onPick={(x: { pincode: string; city?: string }) => setF((s) => ({ ...s, pincode: x.pincode, city: x.city ?? s.city }))} />
        </div>
        <label className="text-sm font-semibold">Address<textarea required rows={3} value={f.address} onChange={(e) => set("address")(e.target.value)} className="mt-1 w-full rounded-xl border bg-card p-4" /></label>
        <Button type="submit" className="h-12" disabled={busy}>{busy && <Loader2 className="animate-spin" />} Save and continue</Button>
      </form>
    </AppShell>
  );
}
