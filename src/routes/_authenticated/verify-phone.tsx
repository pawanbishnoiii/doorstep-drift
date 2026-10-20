import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Loader2, ShieldCheck, Smartphone } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { AppShell } from "@/components/site/AppShell";
import { sendPhoneOtp, verifyPhoneOtp } from "@/lib/otp.functions";

export const Route = createFileRoute("/_authenticated/verify-phone")({
  head: () => ({ meta: [{ title: "Verify mobile — DropBox" }, { name: "description", content: "Verify your mobile number." }, { property: "og:title", content: "Verify mobile — DropBox" }, { property: "og:description", content: "Verify your mobile number." }] }),
  component: VerifyPhone,
});

function VerifyPhone() {
  const send = useServerFn(sendPhoneOtp);
  const verify = useServerFn(verifyPhoneOtp);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const request = async () => {
    if (!/^[6-9]\d{9}$/.test(phone)) { toast.error("Enter a valid 10-digit mobile number"); return; }
    setBusy(true);
    try {
      const r = await send({ data: { phone } });
      setDevCode(r.devCode);
      setStep("code");
    } catch (e) { toast.error((e as Error).message); }
    setBusy(false);
  };
  const confirm = async () => {
    setBusy(true);
    try {
      await verify({ data: { phone, code } });
      toast.success("Mobile verified!");
      await qc.invalidateQueries({ queryKey: ["profile"] });
      const next = sessionStorage.getItem("dbx_after_auth");
      navigate({ to: next && next !== "/verify-phone" ? next : "/dashboard", replace: true });
    } catch (e) { toast.error((e as Error).message); }
    setBusy(false);
  };

  return (
    <AppShell requirePhone={false}>
      <div className="mx-auto max-w-md rounded-[32px] bg-card p-7 shadow-soft">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary"><Smartphone className="h-7 w-7" /></span>
        <h1 className="mt-5 font-display text-3xl font-extrabold">Verify your mobile</h1>
        <p className="mt-1 text-muted-foreground">We use it for pickup updates and OTP delivery.</p>
        <AnimatePresence mode="wait">
          {step === "phone" ? (
            <motion.div key="p" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="mt-6 space-y-3">
              <div className="flex h-14 items-center rounded-2xl border bg-background px-4 focus-within:ring-2 focus-within:ring-ring">
                <span className="mr-2 font-bold text-muted-foreground">+91</span>
                <input value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))} inputMode="numeric" maxLength={10} placeholder="98765 43210" className="flex-1 bg-transparent text-lg font-bold outline-none" />
              </div>
              <button onClick={request} disabled={busy} className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary font-bold text-primary-foreground">{busy && <Loader2 className="h-5 w-5 animate-spin" />} Send OTP</button>
            </motion.div>
          ) : (
            <motion.div key="c" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} className="mt-6 space-y-4">
              {devCode && (
                <div className="rounded-2xl border-2 border-dashed border-primary bg-primary/5 p-4 text-center">
                  <p className="text-xs font-bold uppercase tracking-wider text-primary">Development mode · SMS not sent</p>
                  <p className="mt-1 font-display text-3xl font-extrabold tracking-[0.3em]">{devCode}</p>
                </div>
              )}
              <p className="text-sm text-muted-foreground">Enter the 6-digit code for +91 {phone}</p>
              <InputOTP autoFocus maxLength={6} value={code} onChange={setCode}>
                <InputOTPGroup className="w-full justify-between">{[0, 1, 2, 3, 4, 5].map((i) => <InputOTPSlot key={i} index={i} className="h-14 w-12 rounded-xl border text-xl font-bold" />)}</InputOTPGroup>
              </InputOTP>
              <button onClick={confirm} disabled={busy || code.length !== 6} className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-ink font-bold text-ink-foreground disabled:opacity-50">{busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />} Verify</button>
              <button onClick={() => { setStep("phone"); setCode(""); }} className="w-full text-sm font-semibold text-muted-foreground">Change number</button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppShell>
  );
}
