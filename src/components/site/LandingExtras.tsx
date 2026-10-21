import envelope from "@/assets/parcel-flyer.webp";
import docPack from "@/assets/parcel-small.webp";
import pkg from "@/assets/parcel-large.webp";
import doc from "@/assets/parcel-a4.webp";
import hub from "@/assets/sorting-hub.jpg";
import rider from "@/assets/pickup-upgraded.jpg";
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
  return (
    <div>
      <section className="mx-auto max-w-6xl px-5 py-16">
        <p className="text-center text-xs font-bold uppercase text-primary">Parcel size guide</p>
        <h2 className="reveal mt-2 text-center text-3xl font-extrabold md:text-4xl">Small envelope. Big delivery.</h2>
        <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4">
          {SIZES.map((s) => (
            <div key={s.name} className="reveal rounded-lg border bg-card p-5 text-center transition-shadow hover:shadow-soft">
              <img data-float src={s.img} alt={`${s.name} parcel`} loading="lazy" width={160} height={160} className="mx-auto h-28 w-28 object-contain" />
              <p className="mt-4 font-bold">{s.name}</p><p className="text-sm text-muted-foreground">{s.dims}</p><p className="text-xs font-semibold text-primary">{s.kg}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="bg-ink px-5 py-16 text-ink-foreground">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-bold uppercase text-primary">From door to door</p>
          <h2 className="reveal mt-3 text-3xl font-extrabold md:text-4xl">How your parcel travels</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <div key={s.title} className="reveal overflow-hidden rounded-lg bg-ink-foreground/5">
                <div className="overflow-hidden"><img src={s.img} alt={s.title} loading="lazy" decoding="async" width={640} height={420} className="parallax-img aspect-[3/2] w-full object-cover" /></div>
                <div className="p-5"><p className="text-xs font-bold text-primary">STEP {i + 1}</p><p className="mt-1 text-xl font-bold">{s.title}</p><p className="mt-2 text-sm text-ink-foreground/70">{s.copy}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
