import { cn } from "@/lib/utils";

export function BrandMark({ className, light }: { className?: string; light?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-primary shadow-glow">
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-primary-foreground" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round">
          <path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z" />
          <path d="M3 7.5 12 12l9-4.5M12 12v9" />
        </svg>
      </span>
      <span className={cn("font-display text-xl font-extrabold tracking-tight", light ? "text-ink-foreground" : "text-ink")}>
        Drop<span className="text-primary">Box</span>
      </span>
    </span>
  );
}
