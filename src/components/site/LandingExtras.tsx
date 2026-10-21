import { useEffect, useRef } from "react";
import envelope from "@/assets/icon-card-envelope.png";
import docPack from "@/assets/icon-doc-pack.png";
import pkg from "@/assets/icon-package.png";
import doc from "@/assets/icon-document.png";
import hub from "@/assets/sorting-hub.jpg";
import rider from "@/assets/rider.jpg";
import doorstep from "@/assets/doorstep.jpg";

const SIZES = [
  { img: envelope, name: "Envelope", dims: "35 × 25 × 2 cm", kg: "up to 0.5 kg" },
  { img: doc, name: "Documents", dims: "33 × 25 × 5 cm", kg: "up to 1 kg" },
  { img: docPack, name: "Small box", dims: "30 × 20 × 15 cm", kg: "up to 3 kg" },
  { img: pkg, name: "Large box", dims: "50 × 40 × 30 cm", kg: "up to 15 kg" },
];
const STEPS = [
  { img: rider, title: "We pick it up", copy: "A rider collects from your door at the time you choose." },
  { img: hub, title: "Sorted & scanned", copy: "Every parcel is barcoded, bagged and sealed at the hub." },
  { img: doorstep, title: "Delivered", copy: "Live updates at every scan until it reaches their door." },
];

/** Parcel size guide and journey section with scroll-triggered GSAP reveals. */
export function LandingExtras() {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let ctx: { revert: () => void } | undefined;
    (async () => {
      const { gsap } = await import("gsap");
      const { ScrollTrigger } = await import("gsap/ScrollTrigger");
      gsap.registerPlugin(ScrollTrigger);
      ctx = gsap.context(() => {
        gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el, i) => {
          gsap.from(el, { y: 40, opacity: 0, duration: 0.7, delay: (i % 4) * 0.08, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 88%" } });
        });
        gsap.to("[data-float]", { y: -8, duration: 1.6, ease: "sine.inOut", yoyo: true, repeat: -1, stagger: 0.2 });
      }, root);
    })();
    return () => ctx?.revert();
  }, []);
  return (
    <div ref={root}>
      <section className="mx-auto max-w-6xl px-5 py-16">
        <p className="text-center text-xs font-bold uppercase text-primary">Parcel size guide</p>
        <h2 className="mt-2 text-center text-4xl font-bold">Pick a size. We handle the rest.</h2>
        <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4">
          {SIZES.map((s) => (
            <div key={s.name} data-reveal className="rounded-lg border bg-card p-5 text-center transition-shadow hover:shadow-soft">
              <img data-float src={s.img} alt={`${s.name} parcel`} loading="lazy" width={160} height={160} className="mx-auto h-28 w-28 object-contain" />
              <p className="mt-4 font-bold">{s.name}</p><p className="text-sm text-muted-foreground">{s.dims}</p><p className="text-xs font-semibold text-primary">{s.kg}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="bg-ink px-5 py-16 text-ink-foreground">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-4xl font-bold">How your parcel travels</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <div key={s.title} data-reveal className="overflow-hidden rounded-lg bg-ink-foreground/5">
                <img src={s.img} alt={s.title} loading="lazy" width={640} height={420} className="aspect-[3/2] w-full object-cover" />
                <div className="p-5"><p className="text-xs font-bold text-primary">STEP {i + 1}</p><p className="mt-1 text-xl font-bold">{s.title}</p><p className="mt-2 text-sm text-ink-foreground/70">{s.copy}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
