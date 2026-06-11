import { and, desc, eq } from "drizzle-orm";
import { PDFParse } from "pdf-parse";
import { db } from "../db/client.js";
import {
  knowledgeChunks,
  knowledgeSources,
  type KnowledgeSourceRow,
} from "../db/schema.js";
import { embed, cosineSimilarity } from "../integrations/embeddings.js";
import { chunkText, faqChunk } from "./chunker.js";

/**
 * Base de conocimiento por bot (US-009): ingestión → chunking → embeddings →
 * índice. Indexado async in-process (sin cola externa en MVP).
 *
 * Los embeddings se guardan como jsonb y la similitud se calcula in-process
 * porque el Postgres de Dokploy no trae pgvector (ver nota en schema.ts).
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

/** Crea la fuente y dispara el indexado async. Devuelve el id de inmediato. */
export async function createSource(
  tenantId: string,
  botId: string,
  input: SourceInput,
  userId: string,
): Promise<{ id: string }> {
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
    .values({ tenantId, botId, kind: input.kind, title, rawText, status: "pending", createdBy: userId })
    .returning({ id: knowledgeSources.id });

  // Indexado fuera del request; el estado de la fuente refleja el progreso.
  setImmediate(() => {
    indexSource(row!.id).catch((e) => console.error("[knowledge] indexSource", e));
  });
  return { id: row!.id };
}

export class KnowledgeValidationError extends Error {}

/** Pipeline de indexado: chunk → embed → reemplazo atómico de chunks. */
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
    const pieces =
      source.kind === "faq" ? [source.rawText] : chunkText(source.rawText);
    if (pieces.length === 0) {
      throw new Error("La fuente no tiene texto extraíble");
    }
    const vectors = await embed(pieces);

    // Reemplazo sin huérfanos (P2): delete + insert + ready en una transacción.
    await db.transaction(async (tx) => {
      await tx.delete(knowledgeChunks).where(eq(knowledgeChunks.sourceId, sourceId));
      await tx.insert(knowledgeChunks).values(
        pieces.map((content, seq) => ({
          tenantId: source.tenantId,
          botId: source.botId,
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

/** Reindexa una fuente existente (2.3, 2.4). */
export async function reindex(botId: string, sourceId: string): Promise<boolean> {
  const [source] = await db
    .select({ id: knowledgeSources.id })
    .from(knowledgeSources)
    .where(and(eq(knowledgeSources.id, sourceId), eq(knowledgeSources.botId, botId)));
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

/** Elimina la fuente; los chunks caen por FK cascade (1.5). */
export async function deleteSource(botId: string, sourceId: string): Promise<boolean> {
  const rows = await db
    .delete(knowledgeSources)
    .where(and(eq(knowledgeSources.id, sourceId), eq(knowledgeSources.botId, botId)))
    .returning({ id: knowledgeSources.id });
  return rows.length > 0;
}

export async function listSources(botId: string): Promise<KnowledgeSourceRow[]> {
  return db
    .select()
    .from(knowledgeSources)
    .where(eq(knowledgeSources.botId, botId))
    .orderBy(desc(knowledgeSources.createdAt));
}

/**
 * Búsqueda semántica interna (3.1–3.3). Solo chunks del bot (P1), scores
 * descendentes (P3), umbral mínimo de similitud.
 */
export async function retrieve(
  botId: string,
  query: string,
  k = 5,
  minScore = 0.35,
): Promise<ScoredChunk[]> {
  if (!query.trim()) return [];
  const [qv] = await embed([query]);
  const rows = await db
    .select({
      content: knowledgeChunks.content,
      embedding: knowledgeChunks.embedding,
      sourceId: knowledgeChunks.sourceId,
    })
    .from(knowledgeChunks)
    .where(eq(knowledgeChunks.botId, botId));

  return rows
    .map((r) => ({
      content: r.content,
      sourceId: r.sourceId,
      score: cosineSimilarity(qv!, r.embedding),
    }))
    .filter((r) => r.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}
