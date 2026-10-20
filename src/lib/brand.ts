// Central brand config — change name, domain, contacts and public URL here.
// NOTE: "dropbox.in" is a proposed brand/domain pending ownership and trademark checks.
// This brand is not affiliated with Dropbox, Inc.
export const brand = {
  name: "DropBox",
  domain: "dropbox.in",
  tagline: "Drop it. We'll box the distance.",
  supportPhone: "+91 00000 00000",
  supportEmail: "care@dropbox.in",
};

/** Public base URL used in labels/QR codes. Set VITE_PUBLIC_BASE_URL once the final domain is live. */
export function publicBaseUrl() {
  const env = import.meta.env["VITE_PUBLIC_BASE_URL"] as string | undefined;
  if (env) return env.replace(/\/$/, "");
  if (typeof window !== "undefined") return window.location.origin;
  return "https://dropboxx.lovable.app";
}
