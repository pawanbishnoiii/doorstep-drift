import { createFileRoute } from "@tanstack/react-router";
import { SiteNav, MobileTabBar } from "@/components/site/SiteNav";
import { SiteFooter } from "@/components/site/SiteFooter";
import { brand } from "@/lib/brand";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: `Terms & Conditions — ${brand.name}` },
      { name: "description", content: `Terms and conditions for using ${brand.name} courier services.` },
      { property: "og:title", content: `Terms & Conditions — ${brand.name}` },
      { property: "og:description", content: `Terms and conditions for using ${brand.name} courier services.` },
    ],
  }),
  component: Terms,
});

const sections: [string, string][] = [
  ["1. Service", `${brand.name} ("we") provides doorstep parcel pickup and delivery within India. A booking is confirmed only after a master AWB is issued and, for online payment, after payment succeeds. Pay-at-pickup bookings are confirmed on rider collection.`],
  ["2. Prohibited items", "We do not carry cash, jewellery, explosives, flammables, narcotics, perishables without prior approval, live animals, or any item prohibited by Indian law. We may open and inspect any parcel."],
  ["3. Declared value & liability", "The declared value is the maximum liability per consignment. Without a declared value, liability is limited to ₹500 per consignment or the freight amount, whichever is lower. We are not liable for indirect or consequential loss."],
  ["4. Packaging", "The sender must pack parcels securely. Damage from poor packaging is not covered. Volumetric weight applies where it exceeds actual weight."],
  ["5. Delivery", "Delivery timelines are estimates, not guarantees. Undeliverable parcels (wrong address, refusal) may be returned to the sender at the sender's cost."],
  ["6. Tracking & labels", "Each parcel carries a unique piece ID with a Code 128 barcode and QR code. Cancelled or voided label IDs are never reused. Sharing tracking IDs is at the sender's discretion."],
  ["7. Payments & refunds", "Online payments are processed by our payment partner. Refunds for cancelled bookings are issued to the original payment method within 7 working days. Pay-at-pickup amounts are collected by the rider."],
  ["8. Points & partners", "DropBox Points and Mini Hubs operate under a separate partner agreement. Points may only accept shipments for pincodes allocated to them."],
  ["9. Privacy", "We collect sender/receiver details solely to fulfil deliveries and comply with law. We do not sell personal data."],
  ["10. Brand notice", `${brand.domain} is a proposed brand/domain pending ownership and trademark verification. This service is not affiliated with Dropbox, Inc.`],
  ["11. Jurisdiction", "These terms are governed by the laws of India. Courts at our registered office have exclusive jurisdiction."],
];

function Terms() {
  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <main className="mx-auto max-w-3xl px-4 pb-28 pt-28 md:pt-36">
        <h1 className="font-display text-4xl font-extrabold tracking-tight md:text-5xl">Terms & Conditions</h1>
        <p className="mt-2 text-muted-foreground">Last updated: October 2026 · {brand.name} ({brand.domain})</p>
        <div className="mt-8 space-y-6">
          {sections.map(([h, b]) => (
            <section key={h} className="rounded-3xl border bg-card p-6">
              <h2 className="font-display text-lg font-extrabold">{h}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{b}</p>
            </section>
          ))}
        </div>
        <p className="mt-8 text-sm text-muted-foreground">Questions? Write to {brand.supportEmail} or call {brand.supportPhone}.</p>
      </main>
      <SiteFooter />
      <MobileTabBar />
    </div>
  );
}
