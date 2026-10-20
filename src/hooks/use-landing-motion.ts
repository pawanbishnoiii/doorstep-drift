import { useEffect, useLayoutEffect, type RefObject } from "react";

const useIso = typeof window === "undefined" ? useEffect : useLayoutEffect;

/** Lenis smooth scroll + GSAP ScrollTrigger reveals, loaded client-side only. */
export function useLandingMotion(root: RefObject<HTMLElement | null>) {
  useIso(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !root.current) return;
    let cleanup = () => {};
    let cancelled = false;
    (async () => {
      const [{ default: gsap }, { ScrollTrigger }, { default: Lenis }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
        import("lenis"),
      ]);
      if (cancelled || !root.current) return;
      gsap.registerPlugin(ScrollTrigger);
      const lenis = new Lenis({ duration: 1.05, smoothWheel: true });
      let frame = 0;
      const raf = (t: number) => { lenis.raf(t); frame = requestAnimationFrame(raf); };
      frame = requestAnimationFrame(raf);
      lenis.on("scroll", ScrollTrigger.update);
      const ctx = gsap.context(() => {
        gsap.from(".hero-rise", { y: 44, opacity: 0, duration: 1, stagger: 0.09, ease: "power4.out" });
        gsap.from(".hero-art", { scale: 0.9, rotate: 3, opacity: 0, duration: 1.3, delay: 0.15, ease: "power4.out" });
        gsap.to(".hero-art", { yPercent: 8, ease: "none", scrollTrigger: { trigger: ".hero-shell", start: "top top", end: "bottom top", scrub: 1 } });
        gsap.utils.toArray<HTMLElement>(".reveal").forEach((el) =>
          gsap.from(el, { y: 45, opacity: 0, duration: 0.85, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 86%", once: true } }),
        );
        gsap.utils.toArray<HTMLElement>(".parallax-img").forEach((el) =>
          gsap.fromTo(el, { scale: 1.15 }, { scale: 1, ease: "none", scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: 1 } }),
        );
        gsap.fromTo(".route-line", { strokeDashoffset: 1200 }, { strokeDashoffset: 0, ease: "none", scrollTrigger: { trigger: ".route-shell", start: "top 75%", end: "bottom 60%", scrub: 1 } });
        gsap.fromTo(".timeline-progress", { scaleY: 0 }, { scaleY: 1, transformOrigin: "top center", ease: "none", scrollTrigger: { trigger: ".timeline-shell", start: "top 65%", end: "bottom 70%", scrub: 1 } });
        gsap.utils.toArray<HTMLElement>(".timeline-card").forEach((card, i) =>
          gsap.from(card, { x: i % 2 ? 70 : -70, opacity: 0, ease: "power3.out", scrollTrigger: { trigger: card, start: "top 85%", end: "top 60%", scrub: 1 } }),
        );
        gsap.utils.toArray<HTMLElement>(".count-up").forEach((el) => {
          const end = Number(el.dataset["to"] ?? 0);
          const obj = { v: 0 };
          gsap.to(obj, { v: end, duration: 1.6, ease: "power2.out", scrollTrigger: { trigger: el, start: "top 90%", once: true }, onUpdate: () => { el.textContent = Math.round(obj.v).toLocaleString("en-IN") + (el.dataset["suffix"] ?? ""); } });
        });
      }, root);
      cleanup = () => { cancelAnimationFrame(frame); lenis.destroy(); ctx.revert(); };
    })();
    return () => { cancelled = true; cleanup(); };
  }, []);
}
