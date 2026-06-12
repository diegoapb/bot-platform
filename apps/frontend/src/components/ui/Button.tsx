import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Botón base del Open Solvex DS.
 * - `primary`  → CTA lime sobre forest, con glow en hover (acción única por vista).
 * - `accent`   → variante sólida lime para acciones destacadas en superficie clara.
 * - `outline`  → hairline que vira a lime/graphite en hover (acción secundaria).
 * - `ghost`    → sin borde, hover suave (acciones terciarias / toolbars).
 * - `danger`   → acciones destructivas.
 */
export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "rounded-pill bg-accent text-on-accent hover:-translate-y-px hover:bg-accent-hover hover:shadow-glow",
        accent: "rounded-pill bg-accent text-on-accent hover:bg-accent-hover",
        outline:
          "rounded-pill border border-line-strong bg-transparent text-fg hover:border-accent hover:text-fg hover:-translate-y-px",
        ghost: "rounded-pill bg-transparent text-fg2 hover:bg-chip hover:text-fg",
        danger:
          "rounded-pill border border-danger/40 bg-transparent text-danger hover:bg-danger-bg",
      },
      size: {
        sm: "h-8 px-3 text-[13px]",
        md: "h-10 px-5 text-sm",
        lg: "h-12 px-7 text-[15px]",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";
