import { Hono } from "hono";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import {
  conversations,
  conversationTransitions,
  generations,
  processedMessages,
} from "../db/schema.js";
import { requireAuth, requireTenant } from "../middleware/auth.js";

/**
 * Métricas del tenant (US-014 R2): agregaciones SQL directas sobre las tablas
 * operativas, siempre filtradas por tenant (P1). Rango 7d | 30d.
 */
export const metricsRoutes = new Hono();
metricsRoutes.use("*", requireAuth, requireTenant);

metricsRoutes.get("/", async (c) => {
  const tenantId = c.get("tenantId")!;
  const range = c.req.query("range") ?? "7d";
  if (range !== "7d" && range !== "30d") {
    return c.json({ ok: false, error: "Rango inválido (7d | 30d)" }, 422);
  }
  const days = range === "7d" ? 7 : 30;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [[inbound], [botReplies], [handoffs], [activeConversations], daily] =
    await Promise.all([
      db
        .select({ n: sql<number>`count(*)::int` })
        .from(processedMessages)
        .where(
          and(
            eq(processedMessages.tenantId, tenantId),
            eq(processedMessages.source, "evolution"),
            gt(processedMessages.createdAt, since),
          ),
        ),
      db
        .select({ n: sql<number>`count(*)::int` })
        .from(generations)
        .where(
          and(
            eq(generations.tenantId, tenantId),
            isNull(generations.error),
            gt(generations.createdAt, since),
          ),
        ),
      db
        .select({ n: sql<number>`count(*)::int` })
        .from(conversationTransitions)
        .where(
          and(
            eq(conversationTransitions.tenantId, tenantId),
            eq(conversationTransitions.toMode, "human"),
            gt(conversationTransitions.createdAt, since),
          ),
        ),
      db
        .select({ n: sql<number>`count(*)::int` })
        .from(conversations)
        .where(and(eq(conversations.tenantId, tenantId), gt(conversations.lastMsgAt, since))),
      // Serie diaria para el gráfico del dashboard.
      db
        .select({
          day: sql<string>`to_char(date_trunc('day', ${processedMessages.createdAt}), 'YYYY-MM-DD')`,
          inbound: sql<number>`count(*) FILTER (WHERE ${processedMessages.source} = 'evolution')::int`,
        })
        .from(processedMessages)
        .where(and(eq(processedMessages.tenantId, tenantId), gt(processedMessages.createdAt, since)))
        .groupBy(sql`1`)
        .orderBy(sql`1`),
    ]);

  const repliesDaily = await db
    .select({
      day: sql<string>`to_char(date_trunc('day', ${generations.createdAt}), 'YYYY-MM-DD')`,
      botReplies: sql<number>`count(*) FILTER (WHERE ${generations.error} IS NULL)::int`,
    })
    .from(generations)
    .where(and(eq(generations.tenantId, tenantId), gt(generations.createdAt, since)))
    .groupBy(sql`1`)
    .orderBy(sql`1`);

  // Merge de las dos series por día (días sin actividad no aparecen).
  const byDay = new Map<string, { day: string; inbound: number; botReplies: number }>();
  for (const r of daily) byDay.set(r.day, { day: r.day, inbound: r.inbound, botReplies: 0 });
  for (const r of repliesDaily) {
    const row = byDay.get(r.day) ?? { day: r.day, inbound: 0, botReplies: 0 };
    row.botReplies = r.botReplies;
    byDay.set(r.day, row);
  }

  return c.json({
    ok: true,
    data: {
      range,
      inbound: inbound?.n ?? 0,
      botReplies: botReplies?.n ?? 0,
      handoffs: handoffs?.n ?? 0,
      activeConversations: activeConversations?.n ?? 0,
      daily: [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day)),
    },
  });
});
