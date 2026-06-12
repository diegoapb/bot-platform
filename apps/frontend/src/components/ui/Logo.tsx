import { cn } from "@/lib/utils";

/**
 * Lockup Open Solvex: marca circular (espirales lime) + wordmark.
 * En superficie clara el wordmark es graphite con "Solvex" en lime.
 */
export function Logo({
  className,
  markOnly,
  surface = "light",
}: {
  className?: string;
  markOnly?: boolean;
  surface?: "light" | "dark";
}) {
  const mark = surface === "dark" ? "/brand/mark-lime.svg" : "/brand/mark-forest.svg";
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <img src={mark} alt="Open Solvex" className="h-7 w-7" />
      {!markOnly && (
        <span className="font-display text-[17px] font-medium tracking-tight text-fg">
          Open <em className="not-italic text-accent">Solvex</em>
        </span>
      )}
    </span>
  );
}
