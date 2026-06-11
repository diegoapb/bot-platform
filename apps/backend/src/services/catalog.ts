import { and, desc, eq, ilike, isNull, or, sql, type SQL } from "drizzle-orm";
import Papa from "papaparse";
import { db } from "../db/client.js";
import { catalogItems, type CatalogItemRow } from "../db/schema.js";
import { catalogItemInputSchema, type CatalogItemInput } from "@bot/shared";

/**
 * Catálogo de productos/servicios por bot (US-010). Búsqueda léxica con la
 * columna generada `search tsvector` (config spanish) — sin embeddings.
 */

export async function createItem(
  tenantId: string,
  botId: string,
  input: CatalogItemInput,
): Promise<CatalogItemRow> {
  const [row] = await db
    .insert(catalogItems)
    .values({ ...input, tenantId, botId })
    .returning();
  return row!;
}

export async function updateItem(
  botId: string,
  id: string,
  patch: Partial<CatalogItemInput>,
): Promise<CatalogItemRow | null> {
  const [row] = await db
    .update(catalogItems)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(catalogItems.id, id), eq(catalogItems.botId, botId)))
    .returning();
  return row ?? null;
}

/** Archiva (1.3) o desarchiva un ítem; archivado = fuera de las consultas del bot. */
export async function setArchived(
  botId: string,
  id: string,
  archived: boolean,
): Promise<CatalogItemRow | null> {
  const [row] = await db
    .update(catalogItems)
    .set({ archivedAt: archived ? new Date() : null, updatedAt: new Date() })
    .where(and(eq(catalogItems.id, id), eq(catalogItems.botId, botId)))
    .returning();
  return row ?? null;
}

/** Lista para el panel (3.1): filtros por texto y disponibilidad; incluye archivados. */
export async function listItems(
  botId: string,
  filter: { q?: string; availability?: string },
): Promise<CatalogItemRow[]> {
  const conds: SQL[] = [eq(catalogItems.botId, botId)];
  if (filter.availability) {
    conds.push(eq(catalogItems.availability, filter.availability as any));
  }
  if (filter.q) {
    conds.push(
      or(
        ilike(catalogItems.name, `%${filter.q}%`),
        ilike(catalogItems.description, `%${filter.q}%`),
      )!,
    );
  }
  return db
    .select()
    .from(catalogItems)
    .where(and(...conds))
    .orderBy(desc(catalogItems.updatedAt));
}

/**
 * Consulta interna para el motor (2.1–2.3): solo ítems activos del bot,
 * ranking full-text en español. Fallback ILIKE para términos sin lexemas.
 */
export async function searchCatalog(
  botId: string,
  term: string,
  limit = 8,
): Promise<CatalogItemRow[]> {
  if (!term.trim()) return [];
  const q = sql`plainto_tsquery('spanish', ${term})`;
  const ranked = await db
    .select()
    .from(catalogItems)
    .where(
      and(
        eq(catalogItems.botId, botId),
        isNull(catalogItems.archivedAt),
        sql`"search" @@ ${q}`,
      ),
    )
    .orderBy(sql`ts_rank("search", ${q}) DESC`)
    .limit(limit);
  if (ranked.length > 0) return ranked;

  return db
    .select()
    .from(catalogItems)
    .where(
      and(
        eq(catalogItems.botId, botId),
        isNull(catalogItems.archivedAt),
        ilike(catalogItems.name, `%${term.trim()}%`),
      ),
    )
    .limit(limit);
}

export type ImportReport = {
  created: number;
  rejected: Array<{ row: number; reason: string }>;
};

export const CSV_MAX_ROWS = 500;

/**
 * Import CSV (1.5): columnas name, description, price, currency, availability
 * y attributes (JSON opcional). Atómico por fila (P4): las válidas entran,
 * las inválidas se reportan con motivo.
 */
export async function importCsv(
  tenantId: string,
  botId: string,
  csv: string,
): Promise<ImportReport> {
  const parsed = Papa.parse<Record<string, string>>(csv, {
    header: true,
    skipEmptyLines: true,
  });
  const rows = parsed.data;
  if (rows.length > CSV_MAX_ROWS) {
    throw new CatalogValidationError(`El CSV supera el máximo de ${CSV_MAX_ROWS} filas`);
  }

  const report: ImportReport = { created: 0, rejected: [] };
  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i]!;
    let attributes: Record<string, string> = {};
    if (raw.attributes?.trim()) {
      try {
        attributes = JSON.parse(raw.attributes);
      } catch {
        report.rejected.push({ row: i + 1, reason: "attributes no es JSON válido" });
        continue;
      }
    }
    const candidate = {
      name: raw.name?.trim() ?? "",
      description: raw.description?.trim() || null,
      price: raw.price?.trim() ?? "",
      currency: raw.currency?.trim().toUpperCase() ?? "",
      availability: (raw.availability?.trim() || "available") as CatalogItemInput["availability"],
      attributes,
    };
    const valid = catalogItemInputSchema.safeParse(candidate);
    if (!valid.success) {
      const reason = valid.error.issues
        .map((iss) => `${iss.path.join(".")}: ${iss.message}`)
        .join("; ");
      report.rejected.push({ row: i + 1, reason });
      continue;
    }
    await db.insert(catalogItems).values({ ...valid.data, tenantId, botId });
    report.created++;
  }
  return report;
}

export class CatalogValidationError extends Error {}
