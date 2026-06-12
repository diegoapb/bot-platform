import { cn } from "@/lib/utils";

export interface TabItem {
  key: string;
  label: React.ReactNode;
}

/**
 * Navegación por pestañas con subrayado lime (patrón del DS).
 */
export function Tabs({
  items,
  value,
  onChange,
  className,
  end,
}: {
  items: TabItem[];
  value: string;
  onChange: (key: string) => void;
  className?: string;
  /** Contenido alineado a la derecha de la barra (ej. acción "Historial"). */
  end?: React.ReactNode;
}) {
  return (
    <nav
      className={cn(
        "flex items-center gap-1 overflow-x-auto border-b border-line",
        className,
      )}
    >
      {items.map((t) => {
        const active = t.key === value;
        return (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            className={cn(
              "-mb-px whitespace-nowrap border-b-2 px-3.5 py-2.5 text-sm transition-colors duration-200",
              active
                ? "border-accent font-medium text-fg"
                : "border-transparent text-fg3 hover:text-fg",
            )}
          >
            {t.label}
          </button>
        );
      })}
      {end && <div className="ml-auto pl-2">{end}</div>}
    </nav>
  );
}
