import { Link } from "@tanstack/react-router";
import { ArrowRight, Home, PackageSearch, Send, Store, UserRound } from "lucide-react";
import { BrandMark } from "./BrandMark";
import { useSession } from "@/hooks/use-session";

export function SiteNav() {
  const { user } = useSession();
  return (
    <nav className="fixed inset-x-0 top-0 z-50 px-3 pt-3 md:px-6 md:pt-5">
      <div className="mx-auto flex max-w-[1240px] items-center justify-between rounded-[22px] border border-card/80 bg-background/80 px-4 py-3 shadow-soft backdrop-blur-2xl md:px-6">
        <Link to="/" aria-label="DropBox home"><BrandMark /></Link>
        <div className="hidden items-center gap-7 text-sm font-semibold text-muted-foreground md:flex">
          <Link to="/track" className="hover:text-ink" activeProps={{ className: "text-ink" }}>Track</Link>
          <Link to="/ship" className="hover:text-ink" activeProps={{ className: "text-ink" }}>Ship now</Link>
          <Link to="/point-partner" className="hover:text-ink" activeProps={{ className: "text-ink" }}>Become a Point</Link>
        </div>
        <Link to={user ? "/dashboard" : "/auth"} className="group flex items-center gap-2 rounded-[14px] bg-ink px-4 py-2.5 text-sm font-bold text-ink-foreground transition-transform hover:-translate-y-0.5">
          {user ? "My shipments" : "Sign in"} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </nav>
  );
}

/** App-like bottom bar on phones. */
export function MobileTabBar() {
  const items = [
    { to: "/", icon: Home, label: "Home" },
    { to: "/track", icon: PackageSearch, label: "Track" },
    { to: "/ship", icon: Send, label: "Ship" },
    { to: "/point-partner", icon: Store, label: "Partner" },
    { to: "/dashboard", icon: UserRound, label: "Me" },
  ] as const;
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] md:hidden">
      <div className="mx-auto flex max-w-md items-center justify-around rounded-[24px] border bg-card/90 p-1.5 shadow-soft backdrop-blur-2xl">
        {items.map(({ to, icon: Icon, label }) => (
          <Link key={to} to={to} activeOptions={{ exact: to === "/" }} className="flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-2 text-[10px] font-bold text-muted-foreground" activeProps={{ className: "bg-primary text-primary-foreground" }}>
            <Icon className="h-5 w-5" />{label}
          </Link>
        ))}
      </div>
    </div>
  );
}
