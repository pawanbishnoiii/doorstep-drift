import { cn } from "@/lib/utils";
import speedLogo from "@/assets/get-xpress-speed.png.asset.json";

export function BrandMark({ className, light }: { className?: string; light?: boolean }) {
  return (
    <span className={cn("inline-flex w-44 items-center", className)}><img src={speedLogo.url} alt="Get Xpress" width={1920} height={640} className="h-12 w-full object-contain" /></span>
  );
}
