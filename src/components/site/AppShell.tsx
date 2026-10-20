import { Link, Navigate, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import {
  BarChart3, Bell, ClipboardList, Home, Loader2, LogOut, MapPin, PackagePlus, PackageSearch, ScanLine, ShieldCheck, Store, Ticket, UserRound,
} from "lucide-react";
import { BrandMark } from "./BrandMark";
import { useProfile } from "@/hooks/use-profile";
import { ROLE_LABEL, useRoles } from "@/hooks/use-roles";
import { supabase } from "@/integrations/supabase/client";

type NavItem = { to: string; label: string; icon: typeof Home; staff?: boolean; admin?: boolean };
const NAV: { group: string; items: NavItem[] }[] = [
  { group: "Shipping", items: [
    { to: "/dashboard", label: "Home", icon: Home },
    { to: "/ship", label: "Add order", icon: PackagePlus },
    { to: "/orders", label: "Orders", icon: ClipboardList },
    { to: "/track", label: "Track", icon: PackageSearch },
    { to: "/notifications", label: "Notifications", icon: Bell },
  ] },
  { group: "Operations", items: [
    { to: "/analytics", label: "Analytics", icon: BarChart3, staff: true },
    { to: "/scan", label: "Scan parcels", icon: ScanLine, staff: true },
    { to: "/console", label: "Pincodes & staff", icon: MapPin, staff: true },
  ] },
  { group: "Admin", items: [
    { to: "/applications", label: "Point applications", icon: Store, admin: true },
    { to: "/coupons", label: "Offers & coupons", icon: Ticket, admin: true },
  ] },
];

/** Signed-in frame: Shiprocket-style sidebar on desktop, app-style tab bar on phones. Requires verified phone. */
export function AppShell({ children, requirePhone = true, wide = false }: { children: ReactNode; requirePhone?: boolean; wide?: boolean }) {
  const { data, isLoading } = useProfile();
  const { isStaff, isAdmin, primary } = useRoles();
  const qc = useQueryClient();
  const navigate = useNavigate();
  if (isLoading) return <div className="grid min-h-screen place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (requirePhone && !data?.profile?.phone_verified) return <Navigate to="/verify-phone" replace />;
  const signOut = async () => {
    await qc.cancelQueries(); qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };
  const visible = (i: NavItem) => (!i.staff || isStaff) && (!i.admin || isAdmin);
  const name = data?.profile?.full_name || data?.user.email || "";

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-ink text-ink-foreground lg:flex">
        <Link to="/" className="px-6 py-5"><BrandMark /></Link>
        <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-6">
          {NAV.map((g) => {
            const items = g.items.filter(visible);
            if (!items.length) return null;
            return (
              <div key={g.group}>
                <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-widest text-ink-foreground/50">{g.group}</p>
                {items.map(({ to, label, icon: Icon }) => (
                  <Link key={to} to={to} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-ink-foreground/75 transition-colors hover:bg-ink-foreground/10 hover:text-ink-foreground"
                    activeProps={{ className: "bg-primary !text-primary-foreground" }}>
                    <Icon className="h-4 w-4" />{label}
                  </Link>
                ))}
              </div>
            );
          })}
        </nav>
        <div className="border-t border-ink-foreground/10 p-4">
          <p className="truncate text-sm font-bold">{name}</p>
          <p className="text-xs text-ink-foreground/60">{primary ? ROLE_LABEL[primary] : "Customer"}</p>
          <button onClick={signOut} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-ink-foreground/10 py-2 text-sm font-bold"><LogOut className="h-4 w-4" /> Sign out</button>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 border-b bg-background/85 px-4 py-3 backdrop-blur-xl lg:px-8">
          <div className="flex items-center justify-between">
            <Link to="/" className="lg:hidden"><BrandMark /></Link>
            <p className="hidden text-sm font-semibold text-muted-foreground lg:block">{primary ? ROLE_LABEL[primary] : "Customer account"}</p>
            <div className="flex items-center gap-2">
              <Link to="/ship" className="hidden items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground sm:flex"><PackagePlus className="h-4 w-4" /> Add order</Link>
              <Link to="/notifications" aria-label="Notifications" className="grid h-10 w-10 place-items-center rounded-xl border bg-card"><Bell className="h-4 w-4" /></Link>
              <button onClick={signOut} aria-label="Sign out" className="grid h-10 w-10 place-items-center rounded-xl border bg-card lg:hidden"><LogOut className="h-4 w-4" /></button>
            </div>
          </div>
        </header>
        <main className={`mx-auto px-4 pb-28 pt-6 lg:px-8 lg:pb-12 ${wide ? "max-w-7xl" : "max-w-5xl"}`}>{children}</main>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] lg:hidden">
        <div className="mx-auto flex max-w-md items-center justify-around rounded-[24px] border bg-card/90 p-1.5 shadow-soft backdrop-blur-2xl">
          {([
            { to: "/dashboard", icon: Home, label: "Home" },
            { to: "/orders", icon: ClipboardList, label: "Orders" },
            { to: "/ship", icon: PackagePlus, label: "Ship" },
            isStaff ? { to: "/scan", icon: ScanLine, label: "Scan" } : { to: "/track", icon: PackageSearch, label: "Track" },
            isStaff ? { to: "/console", icon: ShieldCheck, label: "Ops" } : { to: "/notifications", icon: UserRound, label: "Me" },
          ] as const).map(({ to, icon: Icon, label }) => (
            <Link key={to} to={to} className="flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-2 text-[10px] font-bold text-muted-foreground" activeProps={{ className: "bg-primary text-primary-foreground" }}>
              <Icon className="h-5 w-5" />{label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export function PageHeader({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight lg:text-4xl">{title}</h1>
        {sub && <p className="mt-1 text-muted-foreground">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function Stat({ label, value, tone = "card" }: { label: string; value: ReactNode; tone?: "card" | "primary" | "ink" | "lime" }) {
  const cls = { card: "border bg-card", primary: "bg-primary text-primary-foreground", ink: "bg-ink text-ink-foreground", lime: "bg-lime text-ink" }[tone];
  return (
    <div className={`rounded-3xl p-5 ${cls}`}>
      <p className="text-xs font-bold uppercase tracking-wider opacity-70">{label}</p>
      <p className="mt-2 font-display text-3xl font-extrabold">{value}</p>
    </div>
  );
}
