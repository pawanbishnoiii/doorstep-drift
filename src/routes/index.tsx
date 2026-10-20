import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight, BadgeCheck, Boxes, Clock3, Globe2, IndianRupee, MapPin, PackageCheck,
  PackageSearch, Plane, Quote, ScanBarcode, ShieldCheck, Sparkles, Star, Truck, Zap,
} from "lucide-react";
import { SiteNav, MobileTabBar } from "@/components/site/SiteNav";
import { SiteFooter } from "@/components/site/SiteFooter";
import { ParcelLottie } from "@/components/site/ParcelLottie";
import { useLandingMotion } from "@/hooks/use-landing-motion";
import { quote, services, type ServiceLevel } from "@/lib/pricing";
import heroCourier from "@/assets/hero-courier.jpg";
import doorstep from "@/assets/doorstep.jpg";
import sortingHub from "@/assets/sorting-hub.jpg";
import seller from "@/assets/seller.jpg";
import rider from "@/assets/rider.jpg";
import international from "@/assets/international.jpg";
import hubPartner from "@/assets/hub-partner.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DropBox — Ship anything, anywhere in India | dropbox.in" },
      { name: "description", content: "Book doorstep pickups, compare rates and track parcels live across 19,000+ pincodes with DropBox courier." },
      { property: "og:title", content: "DropBox — Ship anything, anywhere in India" },
      { property: "og:description", content: "Doorstep pickup, live tracking and honest pricing from your neighbourhood DropBox Point." },
    ],
  }),
  component: Landing,
});

const FloatPill = ({ className, children }: { className: string; children: ReactNode }) => (
  <motion.div className={`absolute z-20 flex items-center gap-2 rounded-2xl border border-card/70 bg-card/90 px-3.5 py-2.5 text-xs font-bold text-ink shadow-soft backdrop-blur-xl ${className}`} animate={{ y: [0, -9, 0] }} transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}>
    {children}
  </motion.div>
);

export const SectionTitle = ({ eyebrow, title, copy, align = "center" }: { eyebrow: string; title: ReactNode; copy?: string; align?: "center" | "left" }) => (
  <div className={`reveal ${align === "center" ? "mx-auto max-w-3xl text-center" : "max-w-2xl"}`}>
    <div className="mb-4 inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.15em] text-primary shadow-sm"><Sparkles className="h-3.5 w-3.5" /> {eyebrow}</div>
    <h2 className="font-display text-[clamp(2.1rem,5vw,4.6rem)] font-extrabold leading-[.96] tracking-[-.05em] text-ink">{title}</h2>
    {copy && <p className={`mt-5 text-base leading-7 text-muted-foreground md:text-lg ${align === "center" ? "mx-auto max-w-2xl" : "max-w-xl"}`}>{copy}</p>}
  </div>
);

const features = [
  { icon: Truck, title: "Doorstep pickup in 2 hours", copy: "Book from your phone, a rider arrives with a printed label. No queues, no printers.", cls: "md:col-span-2 bg-ink text-ink-foreground", acc: "bg-primary text-primary-foreground" },
  { icon: PackageSearch, title: "Live, honest tracking", copy: "Every scan, every hub, every handover — in real time.", cls: "bg-lime text-ink", acc: "bg-ink text-ink-foreground" },
  { icon: ShieldCheck, title: "Insured & tamper-proof", copy: "Sealed DropBox tape, OTP delivery and declared-value cover.", cls: "bg-lilac text-ink", acc: "bg-card text-ink" },
  { icon: IndianRupee, title: "Prices you can read", copy: "Weight, zone, GST — every rupee shown before you pay. No surprise surcharges.", cls: "md:col-span-2 bg-cream text-ink", acc: "bg-primary text-primary-foreground" },
];

const journey = [
  { time: "10:05", title: "Booked from the sofa", copy: "Riya books a pickup in 40 seconds and gets her tracking ID instantly.", img: seller },
  { time: "11:30", title: "Picked up, sealed, scanned", copy: "Our rider arrives, weighs, seals with DropBox tape and scans at the door.", img: rider },
  { time: "22:40", title: "Sorted overnight", copy: "Parcels flow through our sorting hub and onto the right line-haul.", img: sortingHub },
  { time: "Day 2", title: "Delivered with a smile", copy: "OTP-verified handover at the doorstep. Proof of delivery in your app.", img: doorstep },
];

const testimonials = [
  { quote: "I ship 60 orders a day from home. Pickup is on time, every single time.", name: "Ananya Iyer", role: "Handmade candles, Bengaluru", color: "bg-sun" },
  { quote: "Tracking is so clear my customers stopped calling me 'where is my parcel'.", name: "Mehak Arora", role: "Boutique owner, Jaipur", color: "bg-lilac" },
  { quote: "Became a DropBox Point last year — it is now 30% of my shop income.", name: "Sunita Rao", role: "DropBox Point, Pune", color: "bg-lime" },
];

function QuickQuote() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"quote" | "track">("quote");
  const [from, setFrom] = useState("302010");
  const [to, setTo] = useState("560001");
  const [kg, setKg] = useState("1");
  const [svc, setSvc] = useState<ServiceLevel>("standard");
  const [tn, setTn] = useState("");
  const valid = /^\d{6}$/.test(from) && /^\d{6}$/.test(to) && Number(kg) > 0;
  const q = valid ? quote({ fromPin: from, toPin: to, weightKg: Number(kg), service: svc }) : null;
  return (
    <div className="hero-rise relative z-30 mx-auto mt-10 w-full max-w-xl rounded-[28px] border bg-card/95 p-4 shadow-soft backdrop-blur-xl lg:mx-0">
      <div className="mb-4 flex rounded-2xl bg-muted p-1">
        {(["quote", "track"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`relative flex-1 rounded-xl py-2.5 text-sm font-bold ${tab === t ? "text-primary-foreground" : "text-muted-foreground"}`}>
            {tab === t && <motion.span layoutId="tabpill" className="absolute inset-0 rounded-xl bg-primary" transition={{ type: "spring", bounce: 0.25 }} />}
            <span className="relative">{t === "quote" ? "Get a quote" : "Track parcel"}</span>
          </button>
        ))}
      </div>
      {tab === "quote" ? (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <Field label="From pincode" value={from} onChange={setFrom} inputMode="numeric" maxLength={6} />
            <Field label="To pincode" value={to} onChange={setTo} inputMode="numeric" maxLength={6} />
            <Field label="Weight (kg)" value={kg} onChange={setKg} inputMode="decimal" />
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {(Object.keys(services) as ServiceLevel[]).map((k) => (
              <button key={k} onClick={() => setSvc(k)} className={`shrink-0 rounded-xl border px-3 py-2 text-xs font-bold ${svc === k ? "border-ink bg-ink text-ink-foreground" : "bg-card text-ink"}`}>{services[k].label} · {services[k].eta}</button>
            ))}
          </div>
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-cream p-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{q ? `${q.zone} · ${q.weight} kg billable` : "Enter valid pincodes"}</p>
              <p className="font-display text-3xl font-extrabold text-ink">{q ? `₹${q.total}` : "—"}<span className="ml-1 text-xs font-semibold text-muted-foreground">incl. GST</span></p>
            </div>
            <Link to="/ship" search={{ from, to, kg, svc }} className="flex items-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow-glow">Ship now <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </div>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); if (tn.trim()) navigate({ to: "/track", search: { id: tn.trim().toUpperCase() } }); }} className="flex gap-2">
          <input value={tn} onChange={(e) => setTn(e.target.value)} placeholder="Tracking ID e.g. DBX1234567890" className="h-14 flex-1 rounded-2xl border bg-background px-4 font-semibold outline-none focus:ring-2 focus:ring-ring" />
          <button className="rounded-2xl bg-ink px-5 font-bold text-ink-foreground">Track</button>
        </form>
      )}
    </div>
  );
}

function Field({ label, value, onChange, ...rest }: { label: string; value: string; onChange: (v: string) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value">) {
  return (
    <label className="rounded-2xl border bg-background px-3 py-2 focus-within:ring-2 focus-within:ring-ring">
      <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
      <input {...rest} value={value} onChange={(e) => onChange(e.target.value)} className="w-full bg-transparent text-base font-bold text-ink outline-none" />
    </label>
  );
}

function Landing() {
  const root = useRef<HTMLDivElement>(null);
  useLandingMotion(root);
  return (
    <div ref={root} className="min-h-screen overflow-hidden bg-background text-ink selection:bg-primary selection:text-primary-foreground">
      <SiteNav />
      <main>
        {/* HERO */}
        <section className="hero-shell relative overflow-hidden bg-hero px-4 pb-20 pt-28 md:px-8 md:pt-40">
          <div className="relative mx-auto grid max-w-[1240px] items-center gap-12 lg:grid-cols-[1fr_1fr]">
            <div className="relative z-20 text-center lg:text-left">
              <div className="hero-rise mb-6 inline-flex items-center gap-2 rounded-full border bg-card px-3 py-2 text-xs font-extrabold shadow-sm"><span className="grid h-6 w-6 place-items-center rounded-full bg-lime"><Zap className="h-3.5 w-3.5" /></span>19,000+ pincodes · dropbox.in</div>
              <h1 className="hero-rise font-display text-[clamp(3rem,8vw,6.6rem)] font-extrabold leading-[.88] tracking-[-.06em]">
                Drop it.<br />We'll <span className="relative inline-block text-primary">box<svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 200 20" fill="none"><path d="M3 15C50 4 150 2 197 12" stroke="currentColor" strokeWidth="6" strokeLinecap="round" /></svg></span> the distance.
              </h1>
              <p className="hero-rise mx-auto mt-6 max-w-lg text-lg leading-8 text-muted-foreground lg:mx-0">Doorstep pickup, sealed handling and live tracking — from a DropBox Point right in your neighbourhood to any doorstep in India.</p>
              <QuickQuote />
            </div>
            <div className="hero-art relative mx-auto w-full max-w-[560px]">
              <div className="absolute -inset-6 rounded-[48px] bg-primary/15 blur-2xl" />
              <div className="relative overflow-hidden rounded-[40px] border-8 border-card shadow-soft">
                <img src={heroCourier} alt="DropBox courier holding a parcel in Jaipur" width={1280} height={1600} className="aspect-[4/5] w-full object-cover" />
              </div>
              <FloatPill className="-left-4 top-16 md:-left-10"><span className="grid h-7 w-7 place-items-center rounded-full bg-lime"><PackageCheck className="h-4 w-4" /></span>Delivered · Bengaluru</FloatPill>
              <FloatPill className="-right-2 top-1/2 md:-right-8"><Clock3 className="h-4 w-4 text-primary" />Pickup in 1h 52m</FloatPill>
              <FloatPill className="bottom-10 left-6"><Star className="h-4 w-4 fill-sun text-sun" />4.8 from 12k senders</FloatPill>
              <div className="absolute -bottom-8 -right-4 h-28 w-28 rounded-3xl bg-card p-2 shadow-soft"><ParcelLottie className="h-full w-full" /></div>
            </div>
          </div>
        </section>

        {/* MARQUEE */}
        <div className="overflow-hidden border-y bg-ink py-4 text-ink-foreground">
          <div className="flex w-max animate-marquee gap-10 whitespace-nowrap font-display text-2xl font-bold">
            {Array.from({ length: 2 }).flatMap((_, k) => ["Doorstep pickup", "✦", "Same-day intra-city", "✦", "COD ready", "✦", "OTP delivery", "✦", "International routes", "✦", "Business API", "✦"].map((t, i) => <span key={`${k}-${i}`} className={t === "✦" ? "text-primary" : ""}>{t}</span>))}
          </div>
        </div>

        {/* STATS */}
        <section className="px-4 py-20 md:px-8">
          <div className="mx-auto grid max-w-[1240px] grid-cols-2 gap-3 md:grid-cols-4">
            {[["19000", "+", "pincodes served"], ["1200", "+", "DropBox Points"], ["98", "%", "on-time pickups"], ["24", "/7", "human support"]].map(([n, s, l]) => (
              <div key={l} className="reveal rounded-[28px] border bg-card p-6 shadow-sm">
                <p className="count-up font-display text-4xl font-extrabold text-ink md:text-5xl" data-to={n} data-suffix={s}>{Number(n).toLocaleString("en-IN")}{s}</p>
                <p className="mt-1 text-sm font-semibold text-muted-foreground">{l}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FEATURES BENTO */}
        <section className="px-4 pb-24 md:px-8">
          <div className="mx-auto max-w-[1240px]">
            <SectionTitle eyebrow="Why DropBox" title={<>Shipping that feels<br /><span className="text-primary">effortless.</span></>} copy="Everything you need to send a parcel — and nothing that slows you down." />
            <div className="mt-14 grid gap-4 md:grid-cols-3">
              {features.map(({ icon: Icon, title, copy, cls, acc }) => (
                <motion.div key={title} whileHover={{ y: -6 }} className={`reveal rounded-[32px] p-7 md:p-9 ${cls}`}>
                  <span className={`grid h-12 w-12 place-items-center rounded-2xl ${acc}`}><Icon className="h-6 w-6" /></span>
                  <h3 className="mt-8 font-display text-2xl font-extrabold tracking-tight md:text-3xl">{title}</h3>
                  <p className="mt-3 max-w-md opacity-75">{copy}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* JOURNEY TIMELINE */}
        <section className="timeline-shell relative bg-cream px-4 py-24 md:px-8">
          <div className="mx-auto max-w-[1100px]">
            <SectionTitle eyebrow="A parcel's day" title={<>From your door<br />to theirs.</>} />
            <div className="relative mt-16">
              <div className="absolute left-5 top-0 h-full w-1 rounded bg-border md:left-1/2 md:-translate-x-1/2"><div className="timeline-progress h-full w-full rounded bg-primary" /></div>
              <div className="space-y-12">
                {journey.map((j, i) => (
                  <div key={j.title} className={`timeline-card relative grid items-center gap-6 pl-14 md:grid-cols-2 md:pl-0 ${i % 2 ? "md:[&>*:first-child]:order-2" : ""}`}>
                    <div className="overflow-hidden rounded-[28px] shadow-soft"><img src={j.img} alt={j.title} loading="lazy" className="parallax-img aspect-[4/3] w-full object-cover" /></div>
                    <div className={i % 2 ? "md:pr-16 md:text-right" : "md:pl-16"}>
                      <span className="inline-block rounded-full bg-ink px-3 py-1 text-xs font-bold text-ink-foreground">{j.time}</span>
                      <h3 className="mt-3 font-display text-3xl font-extrabold tracking-tight">{j.title}</h3>
                      <p className="mt-2 text-muted-foreground">{j.copy}</p>
                    </div>
                    <span className="absolute left-2.5 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full border-4 border-cream bg-primary md:left-1/2 md:-translate-x-1/2" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ROUTE MAP / SERVICES */}
        <section className="route-shell px-4 py-24 md:px-8">
          <div className="mx-auto grid max-w-[1240px] items-center gap-12 lg:grid-cols-2">
            <div>
              <SectionTitle align="left" eyebrow="Services" title={<>One network.<br />Every kind of send.</>} />
              <div className="mt-8 space-y-3">
                {[
                  { icon: Truck, t: "Domestic Standard & Express", d: "Door-to-door across India, 1–5 days." },
                  { icon: Zap, t: "Same-day intra-city", d: "Pickup and drop before sunset." },
                  { icon: Plane, t: "International", d: "Documents & parcels to configured countries." },
                  { icon: Boxes, t: "Business & D2C", d: "Bulk bookings, COD, API and webhooks." },
                ].map(({ icon: Icon, t, d }) => (
                  <div key={t} className="reveal flex items-center gap-4 rounded-3xl border bg-card p-4">
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary"><Icon className="h-6 w-6" /></span>
                    <div><p className="font-bold">{t}</p><p className="text-sm text-muted-foreground">{d}</p></div>
                  </div>
                ))}
              </div>
            </div>
            <div className="reveal relative overflow-hidden rounded-[40px] bg-ink p-6 text-ink-foreground">
              <img src={international} alt="Cargo loading for international shipping" loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-40" />
              <svg viewBox="0 0 400 420" className="relative w-full">
                <path className="route-line" d="M60 360 C 120 260, 90 180, 180 160 S 300 90, 340 60" stroke="var(--primary)" strokeWidth="5" fill="none" strokeLinecap="round" strokeDasharray="1200" />
                {[[60, 360, "Jaipur"], [180, 160, "Delhi hub"], [340, 60, "Bengaluru"]].map(([x, y, n]) => (
                  <g key={n as string}><circle cx={x as number} cy={y as number} r="10" fill="var(--lime)" /><text x={(x as number) + 16} y={(y as number) + 5} fill="currentColor" fontSize="16" fontWeight="700">{n}</text></g>
                ))}
              </svg>
              <div className="relative mt-2 flex items-center gap-3 rounded-2xl bg-card/10 p-4 backdrop-blur"><MapPin className="h-5 w-5 text-primary" /><p className="text-sm font-semibold">Every scan updates the route you see — live.</p></div>
            </div>
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section className="bg-ink px-4 py-24 text-ink-foreground md:px-8">
          <div className="mx-auto max-w-[1240px]">
            <h2 className="reveal font-display text-[clamp(2.1rem,5vw,4.2rem)] font-extrabold leading-none tracking-tight">Loved by senders<br /><span className="text-primary">across India.</span></h2>
            <div className="mt-12 grid gap-4 md:grid-cols-3">
              {testimonials.map((t) => (
                <div key={t.name} className="reveal rounded-[28px] bg-card p-7 text-card-foreground">
                  <Quote className="h-8 w-8 text-primary" />
                  <p className="mt-4 text-lg font-semibold leading-7">{t.quote}</p>
                  <div className="mt-6 flex items-center gap-3"><span className={`grid h-11 w-11 place-items-center rounded-full font-bold ${t.color}`}>{t.name[0]}</span><div><p className="font-bold">{t.name}</p><p className="text-xs text-muted-foreground">{t.role}</p></div></div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PARTNER CTA */}
        <section className="px-4 py-24 md:px-8">
          <div className="reveal mx-auto grid max-w-[1240px] overflow-hidden rounded-[40px] bg-primary text-primary-foreground md:grid-cols-2">
            <div className="p-8 md:p-14">
              <span className="inline-flex items-center gap-2 rounded-full bg-card/20 px-3 py-1 text-xs font-bold"><BadgeCheck className="h-4 w-4" /> Partner program</span>
              <h2 className="mt-5 font-display text-[clamp(2.2rem,4.5vw,4rem)] font-extrabold leading-[.95] tracking-tight">Turn your shop into a DropBox Point.</h2>
              <p className="mt-4 max-w-md opacity-90">Earn on every parcel booked, received and handed over at your counter. Zero franchise fee.</p>
              <Link to="/point-partner" className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-ink px-6 py-4 font-bold text-ink-foreground">Become a Point <ArrowRight className="h-4 w-4" /></Link>
            </div>
            <img src={hubPartner} alt="DropBox Point partner scanning parcels" loading="lazy" className="h-full max-h-[520px] w-full object-cover" />
          </div>
        </section>

        <section className="px-4 pb-24 text-center md:px-8">
          <div className="reveal mx-auto max-w-2xl">
            <Globe2 className="mx-auto h-10 w-10 text-primary" />
            <h2 className="mt-4 font-display text-4xl font-extrabold tracking-tight md:text-5xl">Ready to send your first box?</h2>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link to="/ship" className="inline-flex items-center gap-2 rounded-2xl bg-ink px-6 py-4 font-bold text-ink-foreground"><ScanBarcode className="h-5 w-5" /> Book a pickup</Link>
              <Link to="/track" className="inline-flex items-center gap-2 rounded-2xl border bg-card px-6 py-4 font-bold">Track a parcel</Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
      <MobileTabBar />
    </div>
  );
}
