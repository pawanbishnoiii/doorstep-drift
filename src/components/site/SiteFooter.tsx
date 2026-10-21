import { Link } from "@tanstack/react-router";
import solidLogo from "@/assets/getxpress-speed-secondary.png.asset.json";
import { brand } from "@/lib/brand";

export function SiteFooter() {
  return (
    <footer className="bg-ink px-4 pb-32 pt-16 text-ink-foreground md:px-8 md:pb-12">
      <div className="mx-auto grid max-w-[1240px] gap-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div>
          <img src={solidLogo.url} alt="Get Xpress" loading="lazy" decoding="async" width={208} height={56} className="h-14 w-52 object-contain" />
          <h2 className="mt-6 text-2xl font-extrabold">Every parcel.<br/>Moving forward.</h2>
          <p className="mt-4 max-w-sm text-sm leading-6 opacity-70">Courier and shipping across India, with Get Xpress hubs and delivery partners.</p>
          <p className="mt-4 text-xs opacity-50">{brand.domain} · {brand.supportEmail}</p>
        </div>
        <div className="space-y-2 text-sm">
          <p className="font-bold">Ship</p>
          <Link to="/ship" className="block opacity-70 hover:opacity-100">Book a shipment</Link>
          <Link to="/track" className="block opacity-70 hover:opacity-100">Track a parcel</Link>
          <Link to="/demo" className="block opacity-70 hover:opacity-100">Demo workspace</Link>
        </div>
        <div className="space-y-2 text-sm">
          <p className="font-bold">Partner</p>
          <Link to="/point-partner" className="block opacity-70 hover:opacity-100">Open a Get Xpress Hub</Link>
          <Link to="/auth" className="block opacity-70 hover:opacity-100">Sign in</Link>
        </div>
        <div className="space-y-2 text-sm"><p className="font-bold">Policies</p><Link to="/terms" className="block opacity-70 hover:opacity-100">Terms & Conditions</Link><Link to="/privacy" className="block opacity-70 hover:opacity-100">Privacy policy</Link><Link to="/refunds" className="block opacity-70 hover:opacity-100">Cancellations & refunds</Link><Link to="/shipping-policy" className="block opacity-70 hover:opacity-100">Shipping policy</Link></div>
      </div>
      <div className="mx-auto mt-12 flex max-w-[1240px] flex-wrap justify-between gap-3 border-t border-ink-foreground/15 pt-6 text-xs opacity-60"><p>© {new Date().getFullYear()} {brand.name}. All rights reserved.</p><a href={`mailto:${brand.supportEmail}`}>{brand.supportEmail}</a></div>
    </footer>
  );
}
