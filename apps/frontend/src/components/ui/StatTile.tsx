import { cn } from "@/lib/utils";
import { Card } from "./Card";

/**
 * KPI tile del DS: número display grande + label mono en mayúsculas debajo.
 */
export function StatTile({
  value,
  label,
  className,
}: {
  value: React.ReactNode;
  label: string;
  className?: string;
}) {
  return (
    <Card className={cn("p-5", className)}>
      <p className="font-display text-4xl font-medium leading-none tracking-tight text-fg">
        {value}
      </p>
      <p className="mt-2 font-mono text-[11px] uppercase tracking-wide text-fg3">
        {label}
      </p>
    </Card>
  );
}
