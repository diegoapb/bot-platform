import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { bots, botStatusTransitions, type BotRow } from "../db/schema.js";

/**
 * Activación global del bot (E10/US-019). `bots.status` es el switch:
 *  - "active"  → el motor genera respuestas automáticas.
 *  - "paused"  → los mensajes siguen sincronizando a Chatwoot, pero el bot calla.
 *  - "draft"   → bot recién creado, aún sin activar (equivale a pausado para el motor).
 * Todo cambio queda auditado en bot_status_transitions (quién, cuándo, causa).
 */

export type BotStatusCause = "panel:user" | "system:connected";

/** Cambia el status del bot. Idempotente: mismo status => no-op sin transición. */
export async function setBotStatus(
  botId: string,
  toStatus: BotRow["status"],
  cause: BotStatusCause,
  actorId?: string,
): Promise<{ changed: boolean; bot: BotRow | null }> {
  return db.transaction(async (tx) => {
    const [bot] = await tx.select().from(bots).where(eq(bots.id, botId)).for("update");
    if (!bot) return { changed: false, bot: null };
    if (bot.status === toStatus) return { changed: false, bot };

    const [updated] = await tx
      .update(bots)
      .set({ status: toStatus, updatedAt: new Date() })
      .where(eq(bots.id, botId))
      .returning();
    await tx.insert(botStatusTransitions).values({
      tenantId: bot.tenantId,
      botId: bot.id,
      fromStatus: bot.status,
      toStatus,
      cause,
      actorId: actorId ?? null,
    });
    return { changed: true, bot: updated ?? null };
  });
}

/** El motor solo responde con el bot activo (US-019 / criterio E10). */
export function isBotActive(bot: Pick<BotRow, "status">): boolean {
  return bot.status === "active";
}
