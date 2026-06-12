import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Etiqueta / estado del DS. Pill o radio pequeño según contexto.
 * Tono mono opcional para metadatos "system-y".
 */
export const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-pill px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      tone: {
        neutral: "bg-chip text-fg2",
        accent: "bg-accent text-on-accent",
        ok: "bg-ok-bg text-ok",
        warn: "bg-warn-bg text-warn",
        danger: "bg-danger-bg text-danger",
        info: "bg-info-bg text-info",
      },
      mono: { true: "font-mono uppercase tracking-wide", false: "" },
    },
    defaultVariants: { tone: "neutral", mono: false },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  /** Muestra un punto de estado a la izquierda. */
  dot?: boolean;
}

export function Badge({ className, tone, mono, dot, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ tone, mono }), className)} {...props}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}
