import { Link, Navigate, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { Loader2, LogOut } from "lucide-react";
import { BrandMark } from "./BrandMark";
import { MobileTabBar } from "./SiteNav";
import { useProfile } from "@/hooks/use-profile";
import { supabase } from "@/integrations/supabase/client";

/** Signed-in app frame. Sends users without a verified phone to /verify-phone. */
export function AppShell({ children, requirePhone = true }: { children: ReactNode; requirePhone?: boolean }) {
  const { data, isLoading } = useProfile();
  const qc = useQueryClient();
  const navigate = useNavigate();
  if (isLoading) return <div className="grid min-h-screen place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (requirePhone && !data?.profile?.phone_verified) return <Navigate to="/verify-phone" replace />;
  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };
  return (
    <div className="min-h-screen bg-background pb-28 md:pb-10">
      <header className="sticky top-0 z-40 border-b bg-background/85 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link to="/"><BrandMark /></Link>
          <div className="flex items-center gap-2">
            <span className="hidden text-sm font-semibold text-muted-foreground sm:block">{data?.user.email}</span>
            <button onClick={signOut} aria-label="Sign out" className="grid h-10 w-10 place-items-center rounded-xl border bg-card"><LogOut className="h-4 w-4" /></button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 pt-6">{children}</main>
      <MobileTabBar />
    </div>
  );
}
