import { cn } from "@/lib/utils";
import { Eyebrow } from "./Eyebrow";

/**
 * Encabezado de página/sección del DS: eyebrow + título display + lede,
 * con un slot de acciones alineado a la derecha.
 */
export function PageHeader({
  eyebrow,
  eyebrowNum,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string;
  eyebrowNum?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="space-y-3">
        {eyebrow && <Eyebrow num={eyebrowNum}>{eyebrow}</Eyebrow>}
        <h1 className="font-display text-3xl font-medium tracking-tight text-fg">
          {title}
        </h1>
        {description && (
          <p className="max-w-[60ch] text-sm leading-relaxed text-fg2">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}
