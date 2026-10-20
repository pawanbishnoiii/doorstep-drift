import { lazy, Suspense } from "react";
import { ClientOnly } from "@tanstack/react-router";
import parcel from "@/assets/parcel-lottie.json";

const Lottie = lazy(() => import("lottie-react").then((m) => ({ default: m.default })));

export function ParcelLottie({ className }: { className?: string }) {
  return (
    <ClientOnly fallback={<div className={className} />}>
      <Suspense fallback={<div className={className} />}>
        <Lottie animationData={parcel} loop className={className} />
      </Suspense>
    </ClientOnly>
  );
}
