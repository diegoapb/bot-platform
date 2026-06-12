import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Añade lift + sombra suave en hover (para cards clicables). */
  interactive?: boolean;
}

/**
 * Superficie base del DS: papel (`--surface`), hairline a 1px, radio 20px.
 * El reposo descansa en borde + contraste de superficie, no en sombra.
 */
export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, interactive, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-lg border border-line bg-surface text-fg",
        interactive &&
          "transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-accent hover:shadow-e2",
        className,
      )}
      {...props}
    />
  ),
);
Card.displayName = "Card";

export function CardBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-6", className)} {...props} />;
}

export function CardHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 border-b border-line p-6",
        className,
      )}
      {...props}
    />
  );
}

export function CardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn("text-[19px] leading-tight", className)} {...props} />
  );
}
