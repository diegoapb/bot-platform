import { and, isNull, lt } from "drizzle-orm";
import { db } from "../db/client.js";
import { conversations } from "../db/schema.js";
import { consolidate } from "../services/memory.js";
import { runExtraction } from "../services/extraction.js";
import { env } from "../env.js";

/**
 * Job de consolidación de memoria (US-013): cada 15 min busca conversaciones
 * inactivas >6h sin consolidar y ejecuta la extracción secuencialmente.
 * In-process, guard contra solape. Limitación: 1 réplica del backend.
 */

const INTERVAL_MS = 15 * 60 * 1000;
const INACTIVITY_HOURS = 6;

let isRunning = false;

export async function runConsolidationPass(): Promise<number> {
  if (isRunning) return 0;
  isRunning = true;
  try {
    const cutoff = new Date(Date.now() - INACTIVITY_HOURS * 60 * 60 * 1000);
    const stale = await db
      .select()
      .from(conversations)
      .where(and(lt(conversations.lastMsgAt, cutoff), isNull(conversations.consolidatedAt)))
      .limit(50);
    for (const convo of stale) {
      await consolidate(convo);
      // E12: misma ventana de inactividad para refrescar los datos extraídos
      // (cubre conversaciones atendidas por humanos, sin ráfagas del bot).
      await runExtraction(convo);
    }
    if (stale.length > 0) {
      console.log(`[memory-job] consolidadas ${stale.length} conversaciones`);
    }
    return stale.length;
  } finally {
    isRunning = false;
  }
}

export function startMemoryConsolidationJob(): void {
  if (!env.ANTHROPIC_API_KEY) {
    console.warn("[memory-job] ANTHROPIC_API_KEY no configurada; job de memoria desactivado");
    return;
  }
  setInterval(() => {
    runConsolidationPass().catch((e) => console.error("[memory-job]", e));
  }, INTERVAL_MS).unref();
  console.log("[memory-job] consolidación de memoria activa (cada 15 min)");
}
