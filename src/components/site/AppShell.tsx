import { Link, Navigate, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import {
  BarChart3, Bell, ClipboardList, Home, Loader2, LogOut, MapPin, PackagePlus, ScanLine, ShieldCheck, Store, Ticket, UserRound, RotateCcw, Boxes, Coins, Settings, Wallet, Users, ClipboardCheck,
} from "lucide-react";
import { BrandMark } from "./BrandMark";
import { useProfile } from "@/hooks/use-profile";
import { ROLE_LABEL, useRoles } from "@/hooks/use-roles";
import { supabase } from "@/integrations/supabase/client";

import { navVisible } from "@/lib/access";

type NavItem = { to: string; label: string; icon: typeof Home; staff?: boolean; admin?: boolean; wallet?: boolean; customer?: boolean };
export const NAV: { group: string; items: NavItem[] }[] = [
  { group: "My shipping", items: [
    { to: "/users/dashboard", label: "Dashboard", icon: Home, customer: true },
    { to: "/users/addorder", label: "Add order", icon: PackagePlus, customer: true },
    { to: "/users/orders", label: "Orders", icon: ClipboardList, customer: true },
    { to: "/users/returns", label: "Returns", icon: RotateCcw, customer: true },
    { to: "/dashboard", label: "Dashboard", icon: Home, staff: true },
    { to: "/users/addorder", label: "Book parcel", icon: PackagePlus, staff: true },
    { to: "/orders", label: "Orders", icon: ClipboardList, staff: true },
    { to: "/returns", label: "Returns & RTO", icon: RotateCcw, staff: true },
    { to: "/notifications", label: "Notifications", icon: Bell },
  ] },
  { group: "Operations", items: [
    { to: "/scan", label: "Scan parcels", icon: ScanLine, staff: true },
    { to: "/tally", label: "Delivery tally", icon: ClipboardCheck, staff: true },
    { to: "/bags", label: "Dispatch center", icon: Boxes, staff: true },
    { to: "/wallet", label: "Wallet", icon: Wallet, wallet: true },
    { to: "/analytics", label: "Analytics", icon: BarChart3, staff: true },
    { to: "/team-prices", label: "Team prices", icon: Coins, staff: true },
    { to: "/onboarding", label: "My profile", icon: UserRound },
  ] },
  { group: "Admin", items: [
    { to: "/team", label: "Users & last seen", icon: Users, admin: true },
    { to: "/console", label: "Pincodes & staff", icon: MapPin, admin: true },
    { to: "/commissions", label: "Commissions", icon: Coins, admin: true },
    { to: "/applications", label: "Hub applications", icon: Store, admin: true },
    { to: "/coupons", label: "Offers & coupons", icon: Ticket, admin: true },
    { to: "/pincodes", label: "Pincode master", icon: MapPin, admin: true },
    { to: "/settings", label: "Settings & integrations", icon: Settings, admin: true },
    { to: "/diagnostics", label: "Diagnostics", icon: Settings, admin: true },
  ] },
];

function Clock() {
  const [t, setT] = useState<Date | null>(null);
  useEffect(() => { setT(new Date()); const i = setInterval(() => setT(new Date()), 30000); return () => clearInterval(i); }, []);
  return <span>{t ? t.toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : ""}</span>;
}

/** Signed-in frame: Shiprocket-style sidebar on desktop, app-style tab bar on phones. Requires verified phone. */
export function AppShell({ children, requirePhone = true, wide = false, skipOnboarding = false }: { children: ReactNode; requirePhone?: boolean; wide?: boolean; skipOnboarding?: boolean }) {
  const { data, isLoading } = useProfile();
  const { isStaff, isAdmin, primary, roles } = useRoles();
  const isManager = roles.some((r) => r === "state_manager" || r === "state_director");
  useEffect(() => { supabase.rpc("touch_last_seen").then(() => {}); }, []);
  const qc = useQueryClient();
  const navigate = useNavigate();
  if (isLoading) return <div className="grid min-h-screen place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (requirePhone && !data?.profile?.phone_verified) return <Navigate to="/onboarding" replace />;
  if (requirePhone && !skipOnboarding && !data?.profile?.onboarded_at) return <Navigate to="/onboarding" replace />;
  const signOut = async () => {
    await qc.cancelQueries(); qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };
  const visible = (i: NavItem) => navVisible(i, roles);
  const phone = data?.profile?.phone || "Phone not verified";
  const city = (data?.profile as { city?: string | null } | null | undefined)?.city || "India";
  const home = isStaff ? "/dashboard" : "/users/dashboard";
  const name = data?.profile?.full_name || data?.user.email || "";

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-ink text-ink-foreground lg:flex">
        <Link to="/" className="mx-4 my-4 rounded-xl bg-card px-3 py-2"><BrandMark /></Link>
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
          <p className="font-mono text-xs text-ink-foreground/80">{phone}</p>
          <p className="text-xs text-ink-foreground/60">{city} · {primary ? ROLE_LABEL[primary] : "Customer"}</p>
          <button onClick={signOut} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-ink-foreground/10 py-2 text-sm font-bold"><LogOut className="h-4 w-4" /> Sign out</button>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 border-b bg-background/85 px-4 py-3 backdrop-blur-xl lg:px-8">
          <div className="flex items-center justify-between">
            <Link to="/" className="lg:hidden"><BrandMark /></Link>
            <div className="hidden text-sm lg:block"><p className="font-bold">{name} <span className="font-mono font-semibold text-muted-foreground">· {phone}</span></p><p className="text-xs text-muted-foreground">{city} · <Clock /></p></div>
            <div className="flex items-center gap-2">
              <Link to={isStaff ? "/scan" : "/users/dashboard"} className="hidden items-center gap-1.5 rounded-xl border bg-card px-4 py-2 text-sm font-bold sm:flex"><ScanLine className="h-4 w-4" /> Scan</Link>
              <Link to="/users/addorder" className="hidden items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground sm:flex"><PackagePlus className="h-4 w-4" /> Add order</Link>
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
            { to: home, icon: Home, label: "Home" },
            { to: isStaff ? "/orders" : "/users/orders", icon: ClipboardList, label: "Orders" },
            { to: "/users/addorder", icon: PackagePlus, label: "Ship" },
            isStaff ? { to: "/scan", icon: ScanLine, label: "Scan" } : { to: "/users/returns", icon: RotateCcw, label: "Returns" },
            isStaff && !isAdmin ? { to: "/wallet", icon: Wallet, label: "Wallet" } : isAdmin ? { to: "/team", icon: ShieldCheck, label: "Admin" } : { to: "/notifications", icon: UserRound, label: "Me" },
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
    <div className={`rounded-lg p-5 ${cls}`}>
      <p className="text-xs font-bold uppercase tracking-wider opacity-70">{label}</p>
      <p className="mt-2 font-display text-3xl font-extrabold">{value}</p>
    </div>
  );
}
