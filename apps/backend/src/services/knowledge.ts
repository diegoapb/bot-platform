import { and, desc, eq, inArray, lte, sql } from "drizzle-orm";
import { PDFParse } from "pdf-parse";
import { db } from "../db/client.js";
import {
  agents,
  knowledgeChunks,
  knowledgeCollections,
  knowledgeSources,
  type KnowledgeSourceRow,
} from "../db/schema.js";
import { embed } from "../integrations/embeddings.js";
import { chunkText, faqChunk } from "./chunker.js";
import { linkedCollectionIds } from "./collections.js";

/**
 * Base de conocimiento por colección (E13/US-032): ingestión → chunking →
 * embeddings → índice. El conocimiento cuelga de `collection_id` (no del bot) y
 * `retrieve()` opera por agente sobre las colecciones que enlaza (referencia
 * viva). Indexado async in-process (sin cola externa en MVP).
 */

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const SUPPORTED_MIMES: Record<string, "md" | "txt" | "pdf"> = {
  "text/markdown": "md",
  "text/x-markdown": "md",
  "text/plain": "txt",
  "application/pdf": "pdf",
};

export type SourceInput =
  | { kind: "text"; title: string; content: string }
  | { kind: "file"; title: string; buffer: Buffer; mime: string }
  | { kind: "faq"; question: string; answer: string };

export type ScoredChunk = { content: string; score: number; sourceId: string };

export class KnowledgeValidationError extends Error {}

/** Extrae el texto plano de un archivo soportado. */
async function extractText(buffer: Buffer, mime: string): Promise<string> {
  if (SUPPORTED_MIMES[mime] === "pdf") {
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    try {
      const result = await parser.getText();
      return result.text;
    } finally {
      await parser.destroy().catch(() => undefined);
    }
  }
  return buffer.toString("utf-8");
}

/** Colección del tenant, o null (aislamiento R2.2, R2.5). */
async function getCollection(tenantId: string, collectionId: string) {
  const [row] = await db
    .select()
    .from(knowledgeCollections)
    .where(
      and(eq(knowledgeCollections.id, collectionId), eq(knowledgeCollections.tenantId, tenantId)),
    );
  return row ?? null;
}

/** Crea la fuente en una colección del tenant y dispara el indexado async (2.1, 2.2). */
export async function createSource(
  tenantId: string,
  collectionId: string,
  input: SourceInput,
  userId: string,
): Promise<{ id: string }> {
  const collection = await getCollection(tenantId, collectionId);
  if (!collection) throw new KnowledgeValidationError("La colección no existe o es de otro tenant");

  let title: string;
  let rawText: string;
  if (input.kind === "text") {
    title = input.title;
    rawText = input.content;
  } else if (input.kind === "file") {
    if (input.buffer.byteLength > MAX_FILE_BYTES) {
      throw new KnowledgeValidationError("El archivo supera el máximo de 10 MB");
    }
    if (!SUPPORTED_MIMES[input.mime]) {
      throw new KnowledgeValidationError(`Formato no soportado: ${input.mime}`);
    }
    title = input.title;
    rawText = await extractText(input.buffer, input.mime);
  } else {
    title = input.question;
    rawText = faqChunk(input.question, input.answer);
  }

  const [row] = await db
    .insert(knowledgeSources)
    .values({ tenantId, collectionId, kind: input.kind, title, rawText, status: "pending", createdBy: userId })
    .returning({ id: knowledgeSources.id });

  setImmediate(() => {
    indexSource(row!.id).catch((e) => console.error("[knowledge] indexSource", e));
  });
  return { id: row!.id };
}

/** Pipeline de indexado: chunk → embed → reemplazo atómico de chunks (2.3, 2.4). */
export async function indexSource(sourceId: string): Promise<void> {
  const [source] = await db
    .select()
    .from(knowledgeSources)
    .where(eq(knowledgeSources.id, sourceId));
  if (!source) return;

  await db
    .update(knowledgeSources)
    .set({ status: "indexing", error: null, updatedAt: new Date() })
    .where(eq(knowledgeSources.id, sourceId));

  try {
    const pieces = source.kind === "faq" ? [source.rawText] : chunkText(source.rawText);
    if (pieces.length === 0) {
      throw new Error("La fuente no tiene texto extraíble");
    }
    const vectors = await embed(pieces);

    // Reemplazo sin huérfanos (P4): delete + insert + ready en una transacción.
    await db.transaction(async (tx) => {
      await tx.delete(knowledgeChunks).where(eq(knowledgeChunks.sourceId, sourceId));
      await tx.insert(knowledgeChunks).values(
        pieces.map((content, seq) => ({
          tenantId: source.tenantId,
          collectionId: source.collectionId,
          sourceId,
          seq,
          content,
          embedding: vectors[seq]!,
        })),
      );
      await tx
        .update(knowledgeSources)
        .set({ status: "ready", error: null, updatedAt: new Date() })
        .where(eq(knowledgeSources.id, sourceId));
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await db
      .update(knowledgeSources)
      .set({ status: "failed", error: msg, updatedAt: new Date() })
      .where(eq(knowledgeSources.id, sourceId));
  }
}

/** Reindexa una fuente de una colección del tenant (2.4). */
export async function reindex(
  tenantId: string,
  collectionId: string,
  sourceId: string,
): Promise<boolean> {
  const [source] = await db
    .select({ id: knowledgeSources.id })
    .from(knowledgeSources)
    .where(
      and(
        eq(knowledgeSources.id, sourceId),
        eq(knowledgeSources.collectionId, collectionId),
        eq(knowledgeSources.tenantId, tenantId),
      ),
    );
  if (!source) return false;
  await db
    .update(knowledgeSources)
    .set({ status: "pending", updatedAt: new Date() })
    .where(eq(knowledgeSources.id, sourceId));
  setImmediate(() => {
    indexSource(sourceId).catch((e) => console.error("[knowledge] reindex", e));
  });
  return true;
}

/** Elimina la fuente; los chunks caen por FK cascade (P4). */
export async function deleteSource(
  tenantId: string,
  collectionId: string,
  sourceId: string,
): Promise<boolean> {
  const rows = await db
    .delete(knowledgeSources)
    .where(
      and(
        eq(knowledgeSources.id, sourceId),
        eq(knowledgeSources.collectionId, collectionId),
        eq(knowledgeSources.tenantId, tenantId),
      ),
    )
    .returning({ id: knowledgeSources.id });
  return rows.length > 0;
}

export async function listSources(
  tenantId: string,
  collectionId: string,
): Promise<KnowledgeSourceRow[]> {
  return db
    .select()
    .from(knowledgeSources)
    .where(
      and(eq(knowledgeSources.collectionId, collectionId), eq(knowledgeSources.tenantId, tenantId)),
    )
    .orderBy(desc(knowledgeSources.createdAt));
}

/**
 * Recuperación semántica por agente (E13/US-032, 4.1–4.5): busca solo en las
 * colecciones enlazadas al agente (P1) y del mismo tenant (P2), scores
 * descendentes (P3) sobre el umbral. Agente sin colecciones → [] (4.4). La
 * distancia cosena la resuelve Postgres (pgvector) con `<=>` e índice HNSW.
 */
export async function retrieve(
  agentId: string,
  query: string,
  k = 5,
  minScore = 0.35,
): Promise<ScoredChunk[]> {
  if (!query.trim()) return [];
  const linked = await linkedCollectionIds(agentId);
  if (linked.length === 0) return []; // R4.4

  const [agent] = await db
    .select({ tenantId: agents.tenantId })
    .from(agents)
    .where(eq(agents.id, agentId));
  if (!agent) return [];

  const [qv] = await embed([query]);
  const distance = sql<number>`${knowledgeChunks.embedding} <=> ${JSON.stringify(qv)}::vector`;

  const rows = await db
    .select({
      content: knowledgeChunks.content,
      sourceId: knowledgeChunks.sourceId,
      distance,
    })
    .from(knowledgeChunks)
    .where(
      and(
        inArray(knowledgeChunks.collectionId, linked),
        eq(knowledgeChunks.tenantId, agent.tenantId),
        lte(distance, 1 - minScore),
      ),
    )
    .orderBy(distance) // ASC -> habilita el índice HNSW
    .limit(k);

  return rows.map((r) => ({ content: r.content, sourceId: r.sourceId, score: 1 - r.distance }));
}
