import { cn } from "@/lib/utils";

/**
 * Eyebrow del DS: label mono en mayúsculas con tick lime y número estilizado.
 * Ej: `— 01 SERVICIOS`.
 */
export function Eyebrow({
  num,
  children,
  className,
}: {
  num?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("ds-eyebrow", className)}>
      {num && <span className="num">{num}</span>}
      {children}
    </span>
  );
}
