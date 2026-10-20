import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Mail } from "lucide-react";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";
import { BrandMark } from "@/components/site/BrandMark";
import hero from "@/assets/rider.jpg";

const safe = (r?: string) => (r && r.startsWith("/") && !r.startsWith("//") ? r : "/dashboard");

export const Route = createFileRoute("/auth")({
  validateSearch: (s) => z.object({ redirect: z.string().optional() }).parse(s),
  head: () => ({
    meta: [
      { title: "Sign in — DropBox" },
      { name: "description", content: "Sign in to DropBox to book pickups and track your shipments." },
      { property: "og:title", content: "Sign in to DropBox" },
      { property: "og:description", content: "Book pickups and track shipments." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const target = safe(redirect);
  const [showEmail, setShowEmail] = useState(false);
  const [mode, setMode] = useState<"in" | "up">("in");
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    sessionStorage.setItem("dbx_after_auth", target);
    supabase.auth.getSession().then(({ data }) => { if (data.session) navigate({ to: target, replace: true }); });
  }, [target, navigate]);

  const google = async () => {
    setBusy(true);
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: `${window.location.origin}/auth?redirect=${encodeURIComponent(target)}` });
    if (r.error) { toast.error(r.error.message ?? "Google sign-in failed"); setBusy(false); return; }
    if (r.redirected) return;
    navigate({ to: target, replace: true });
  };

  const emailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const p = z.object({ email: z.string().email(), password: z.string().min(8, "Password needs 8+ characters") }).safeParse({ email, password });
    if (!p.success) { toast.error(p.error.issues[0]?.message ?? "Invalid"); return; }
    setBusy(true);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword(p.data);
      setBusy(false);
      if (error) { toast.error(error.message); return; }
      navigate({ to: target, replace: true });
    } else {
      const { error } = await supabase.auth.signUp({ ...p.data, options: { emailRedirectTo: `${window.location.origin}/auth?redirect=${encodeURIComponent(target)}` } });
      setBusy(false);
      if (error) { toast.error(error.message); return; }
      toast.success("Check your email to confirm your account.");
    }
  };

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-2">
      <div className="relative hidden overflow-hidden lg:block">
        <img src={hero} alt="DropBox rider" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/80 to-transparent" />
        <p className="absolute bottom-12 left-12 max-w-md font-display text-5xl font-extrabold leading-none text-ink-foreground">Every parcel, one tap away.</p>
      </div>
      <div className="flex items-center justify-center bg-hero px-5 py-12">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
          <Link to="/"><BrandMark /></Link>
          <h1 className="mt-10 font-display text-4xl font-extrabold tracking-tight">Welcome to DropBox</h1>
          <p className="mt-2 text-muted-foreground">Sign in to book pickups and track parcels. You'll verify your mobile next.</p>
          <button onClick={google} disabled={busy} className="mt-8 flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-ink font-bold text-ink-foreground shadow-soft transition-transform active:scale-[.98]">
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : (
              <svg viewBox="0 0 24 24" className="h-5 w-5"><path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.9-5.5 3.9-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.3 14.6 2.3 12 2.3 6.7 2.3 2.4 6.6 2.4 12s4.3 9.7 9.6 9.7c5.5 0 9.2-3.9 9.2-9.4 0-.6-.1-1.1-.2-1.6H12z" /></svg>
            )}
            Continue with Google
          </button>
          <div className="my-6 flex items-center gap-3 text-xs font-bold text-muted-foreground"><span className="h-px flex-1 bg-border" />OR<span className="h-px flex-1 bg-border" /></div>
          {!showEmail ? (
            <button onClick={() => setShowEmail(true)} className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border bg-card font-bold"><Mail className="h-4 w-4" /> Use email instead</button>
          ) : (
            <form onSubmit={emailSubmit} className="space-y-3">
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Email" className="h-12 w-full rounded-2xl border bg-card px-4 font-semibold outline-none focus:ring-2 focus:ring-ring" />
              <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Password" className="h-12 w-full rounded-2xl border bg-card px-4 font-semibold outline-none focus:ring-2 focus:ring-ring" />
              <button disabled={busy} className="h-12 w-full rounded-2xl bg-primary font-bold text-primary-foreground">{mode === "in" ? "Sign in" : "Create account"}</button>
              <button type="button" onClick={() => setMode(mode === "in" ? "up" : "in")} className="w-full text-sm font-semibold text-muted-foreground">{mode === "in" ? "New here? Create an account" : "Have an account? Sign in"}</button>
            </form>
          )}
        </motion.div>
      </div>
    </div>
  );
}
