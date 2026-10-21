import { cn } from "@/lib/utils";
import wordmark from "@/assets/getxpress-wordmark.png.asset.json";

/** Primary Get Xpress wordmark (orange X, navy letters). */
export function BrandMark({ className }: { className?: string; light?: boolean }) {
  return (
    <span className={cn("inline-flex w-44 items-center", className)}><img src={wordmark.url} alt="Get Xpress" width={1920} height={640} className="h-12 w-full object-contain" /></span>
  );
}
