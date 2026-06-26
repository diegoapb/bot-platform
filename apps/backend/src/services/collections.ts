import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import {
  agentKnowledgeCollections,
  agents,
  knowledgeCollections,
  knowledgeSources,
} from "../db/schema.js";

/**
 * Biblioteca de conocimiento reutilizable (E13/US-032): CRUD de colecciones y
 * enlace N:M agente↔colección con referencia viva. Todo aislado por tenant (P2).
 * El borrado de una colección arrastra sus fuentes, chunks y enlaces por FK
 * cascade (P4); el desenlace no borra la colección (3.4).
 */

export type CollectionSummary = {
  id: string;
  name: string;
  description: string | null;
  sourceCount: number;
};

export class CollectionError extends Error {
  constructor(public code: "empty_name" | "cross_tenant" | "not_found", message?: string) {
    super(message ?? code);
  }
}

/** Adjunta el conteo de fuentes a un set de colecciones. */
async function withSourceCounts(
  rows: Array<{ id: string; name: string; description: string | null }>,
): Promise<CollectionSummary[]> {
  if (rows.length === 0) return [];
  const counts = await db
    .select({ collectionId: knowledgeSources.collectionId, count: sql<number>`count(*)::int` })
    .from(knowledgeSources)
    .where(inArray(knowledgeSources.collectionId, rows.map((r) => r.id)))
    .groupBy(knowledgeSources.collectionId);
  const byId = new Map(counts.map((c) => [c.collectionId, c.count]));
  return rows.map((r) => ({ ...r, sourceCount: byId.get(r.id) ?? 0 }));
}

/** Crea una colección del tenant (1.1, 1.2, 1.7). */
export async function create(
  tenantId: string,
  input: { name: string; description?: string },
  userId: string,
): Promise<{ id: string }> {
  if (!input.name.trim()) throw new CollectionError("empty_name");
  const [row] = await db
    .insert(knowledgeCollections)
    .values({
      tenantId,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      createdBy: userId,
    })
    .returning({ id: knowledgeCollections.id });
  return { id: row!.id };
}

/** Renombra/edita la descripción (1.3). */
export async function update(
  tenantId: string,
  collectionId: string,
  patch: { name?: string; description?: string | null },
): Promise<boolean> {
  if (patch.name !== undefined && !patch.name.trim()) throw new CollectionError("empty_name");
  const rows = await db
    .update(knowledgeCollections)
    .set({
      ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
      ...(patch.description !== undefined
        ? { description: patch.description?.trim() || null }
        : {}),
      updatedAt: new Date(),
    })
    .where(
      and(eq(knowledgeCollections.id, collectionId), eq(knowledgeCollections.tenantId, tenantId)),
    )
    .returning({ id: knowledgeCollections.id });
  return rows.length > 0;
}

/** Colecciones del tenant con conteo de fuentes (1.4). */
export async function list(tenantId: string): Promise<CollectionSummary[]> {
  const rows = await db
    .select({
      id: knowledgeCollections.id,
      name: knowledgeCollections.name,
      description: knowledgeCollections.description,
    })
    .from(knowledgeCollections)
    .where(eq(knowledgeCollections.tenantId, tenantId));
  return withSourceCounts(rows);
}

/** Elimina la colección; fuentes, chunks y enlaces caen por FK cascade (1.5, 1.6, P4). */
export async function remove(tenantId: string, collectionId: string): Promise<boolean> {
  const rows = await db
    .delete(knowledgeCollections)
    .where(
      and(eq(knowledgeCollections.id, collectionId), eq(knowledgeCollections.tenantId, tenantId)),
    )
    .returning({ id: knowledgeCollections.id });
  return rows.length > 0;
}

/** Enlaza una colección a un agente del mismo tenant (3.1–3.3). Idempotente. */
export async function linkAgent(
  tenantId: string,
  agentId: string,
  collectionId: string,
): Promise<void> {
  const [agent] = await db
    .select({ tenantId: agents.tenantId })
    .from(agents)
    .where(eq(agents.id, agentId));
  if (!agent) throw new CollectionError("not_found", "agente no encontrado");
  const [coll] = await db
    .select({ tenantId: knowledgeCollections.tenantId })
    .from(knowledgeCollections)
    .where(eq(knowledgeCollections.id, collectionId));
  if (!coll) throw new CollectionError("not_found", "colección no encontrada");
  if (agent.tenantId !== tenantId || coll.tenantId !== tenantId) {
    throw new CollectionError("cross_tenant");
  }

  await db
    .insert(agentKnowledgeCollections)
    .values({ tenantId, agentId, collectionId })
    .onConflictDoNothing({
      target: [agentKnowledgeCollections.agentId, agentKnowledgeCollections.collectionId],
    });
}

/** Desenlaza una colección de un agente sin borrarla (3.4, 5.3). */
export async function unlinkAgent(
  tenantId: string,
  agentId: string,
  collectionId: string,
): Promise<void> {
  await db
    .delete(agentKnowledgeCollections)
    .where(
      and(
        eq(agentKnowledgeCollections.tenantId, tenantId),
        eq(agentKnowledgeCollections.agentId, agentId),
        eq(agentKnowledgeCollections.collectionId, collectionId),
      ),
    );
}

/** Colecciones enlazadas a un agente — conocimiento visible (3.5, 3.6). */
export async function collectionsForAgent(
  tenantId: string,
  agentId: string,
): Promise<CollectionSummary[]> {
  const rows = await db
    .select({
      id: knowledgeCollections.id,
      name: knowledgeCollections.name,
      description: knowledgeCollections.description,
    })
    .from(agentKnowledgeCollections)
    .innerJoin(
      knowledgeCollections,
      eq(knowledgeCollections.id, agentKnowledgeCollections.collectionId),
    )
    .where(
      and(
        eq(agentKnowledgeCollections.tenantId, tenantId),
        eq(agentKnowledgeCollections.agentId, agentId),
      ),
    );
  return withSourceCounts(rows);
}

/**
 * Colección "propia" del bot legacy (la que creó la migración, marcada por
 * `description = legacy:bot:<id>`). La crea y enlaza al agente si falta. Permite
 * que la gestión de fuentes por bot (UI existente) siga funcionando sobre el
 * modelo de colecciones, sin duplicar conocimiento.
 */
export async function ensureBotCollection(
  bot: { id: string; tenantId: string; name: string; createdBy: string },
  agentId: string,
): Promise<string> {
  const marker = `legacy:bot:${bot.id}`;
  let [coll] = await db
    .select({ id: knowledgeCollections.id })
    .from(knowledgeCollections)
    .where(
      and(
        eq(knowledgeCollections.tenantId, bot.tenantId),
        eq(knowledgeCollections.description, marker),
      ),
    );
  if (!coll) {
    [coll] = await db
      .insert(knowledgeCollections)
      .values({
        tenantId: bot.tenantId,
        name: `${bot.name} — conocimiento`,
        description: marker,
        createdBy: bot.createdBy,
      })
      .returning({ id: knowledgeCollections.id });
  }
  await db
    .insert(agentKnowledgeCollections)
    .values({ tenantId: bot.tenantId, agentId, collectionId: coll!.id })
    .onConflictDoNothing({
      target: [agentKnowledgeCollections.agentId, agentKnowledgeCollections.collectionId],
    });
  return coll!.id;
}

/** Ids de colecciones enlazadas a un agente (para retrieve). */
export async function linkedCollectionIds(agentId: string): Promise<string[]> {
  const rows = await db
    .select({ collectionId: agentKnowledgeCollections.collectionId })
    .from(agentKnowledgeCollections)
    .where(eq(agentKnowledgeCollections.agentId, agentId));
  return rows.map((r) => r.collectionId);
}
