import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/** Indicador de carga inline con spinner sutil. */
export function Loading({
  children = "Cargando…",
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2 text-sm text-fg3", className)}>
      <Loader2 className="h-4 w-4 animate-spin" />
      <span>{children}</span>
    </div>
  );
}

/** Mensaje de error con tono danger del DS. */
export function ErrorText({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  if (!children) return null;
  return (
    <p className={cn("text-sm text-danger", className)}>{children}</p>
  );
}

/** Estado vacío: superficie punteada, mensaje centrado y CTA opcional. */
export function EmptyState({
  title,
  description,
  action,
  icon,
  className,
}: {
  title?: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "ds-dotgrid flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-line-strong px-6 py-12 text-center",
        className,
      )}
    >
      {icon && <div className="text-fg3">{icon}</div>}
      {title && <p className="font-display text-lg text-fg">{title}</p>}
      {description && (
        <p className="max-w-sm text-sm text-fg3">{description}</p>
      )}
      {action}
    </div>
  );
}
