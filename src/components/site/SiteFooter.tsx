import { Link } from "@tanstack/react-router";
import { BrandMark } from "./BrandMark";
import { brand } from "@/lib/brand";

export function SiteFooter() {
  return (
    <footer className="bg-ink px-4 pb-32 pt-16 text-ink-foreground md:px-8 md:pb-12">
      <div className="mx-auto grid max-w-[1240px] gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <BrandMark light />
          <p className="mt-4 max-w-sm text-sm opacity-70">{brand.tagline} Courier and shipping across India from your nearest DropBox Point.</p>
          <p className="mt-4 text-xs opacity-50">{brand.domain} · {brand.supportEmail}</p>
        </div>
        <div className="space-y-2 text-sm">
          <p className="font-bold">Ship</p>
          <Link to="/ship" className="block opacity-70 hover:opacity-100">Book a shipment</Link>
          <Link to="/track" className="block opacity-70 hover:opacity-100">Track a parcel</Link>
        </div>
        <div className="space-y-2 text-sm">
          <p className="font-bold">Partner</p>
          <Link to="/point-partner" className="block opacity-70 hover:opacity-100">Open a DropBox Point</Link>
          <Link to="/terms" className="block opacity-70 hover:opacity-100">Terms & Conditions</Link>
          <Link to="/auth" className="block opacity-70 hover:opacity-100">Sign in</Link>
        </div>
      </div>
      <p className="mx-auto mt-12 max-w-[1240px] text-xs opacity-40">© {new Date().getFullYear()} {brand.name}. Not affiliated with Dropbox, Inc.</p>
    </footer>
  );
}
