import { env } from "../env.js";

/**
 * Cliente de embeddings (OpenAI /v1/embeddings, text-embedding-3-small,
 * 1536 dims). Batching de hasta 100 textos por llamada.
 */
export class EmbeddingsError extends Error {
  constructor(
    public status: number,
    body: string,
  ) {
    super(`Embeddings API ${status}: ${body}`);
  }
}

export const EMBEDDING_DIMS = 1536;
const BATCH_SIZE = 100;

async function embedBatch(texts: string[]): Promise<number[][]> {
  if (!env.OPENAI_API_KEY) {
    throw new EmbeddingsError(0, "OPENAI_API_KEY no configurada");
  }
  let res: Response;
  try {
    res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({ model: env.EMBEDDINGS_MODEL, input: texts }),
    });
  } catch (e) {
    throw new EmbeddingsError(0, e instanceof Error ? e.message : "fetch failed");
  }
  if (!res.ok) throw new EmbeddingsError(res.status, await res.text());
  const json = (await res.json()) as { data: Array<{ index: number; embedding: number[] }> };
  const out = new Array<number[]>(texts.length);
  for (const d of json.data) out[d.index] = d.embedding;
  return out;
}

/** Embeddings de una lista de textos, preservando el orden. */
export async function embed(texts: string[]): Promise<number[][]> {
  const result: number[][] = [];
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    result.push(...(await embedBatch(texts.slice(i, i + BATCH_SIZE))));
  }
  return result;
}

/** Similitud coseno entre dos vectores (mismo largo). */
export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    na += a[i]! * a[i]!;
    nb += b[i]! * b[i]!;
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}
