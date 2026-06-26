import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import {
  agentChannels,
  agents,
  botAssignments,
  type AgentRow,
  type BotRow,
} from "../db/schema.js";
import { env } from "../env.js";

/**
 * Servicio de agentes (E13/US-030): el agente es el "cerebro" desacoplado del
 * transporte. Crea/consulta agentes con aislamiento por tenant, resuelve el
 * agente de un bot legacy de forma idempotente (migración perezosa) y el modelo
 * LLM efectivo (propio del agente o el global).
 */

export type AgentStatus = AgentRow["status"];

/** Modelo efectivo: el del agente si está definido, si no el global. Nunca vacío (P4). */
export function resolveModel(agent: Pick<AgentRow, "model">): string {
  return agent.model && agent.model.trim() !== "" ? agent.model : env.LLM_MODEL;
}

/** Crea un agente del tenant. `status` por defecto 'draft' (1.1, 1.2). */
export async function create(
  tenantId: string,
  input: { name: string; status?: AgentStatus },
  userId: string,
): Promise<AgentRow> {
  const [row] = await db
    .insert(agents)
    .values({
      tenantId,
      createdBy: userId,
      name: input.name,
      ...(input.status ? { status: input.status } : {}),
    })
    .returning();
  return row!;
}

/** Agente del tenant, o null si no existe o es de otro tenant (1.4, 1.5, P3). */
export async function getForTenant(
  tenantId: string,
  agentId: string,
): Promise<AgentRow | null> {
  const [row] = await db
    .select()
    .from(agents)
    .where(and(eq(agents.id, agentId), eq(agents.tenantId, tenantId)));
  return row ?? null;
}

/** Actualiza el agente del tenant (modelo/nombre/estado/audiencia). null si no existe. */
export async function update(
  tenantId: string,
  agentId: string,
  patch: Partial<
    Pick<AgentRow, "name" | "status" | "model" | "whitelistEnabled" | "extractionSchema">
  >,
): Promise<AgentRow | null> {
  const [row] = await db
    .update(agents)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(agents.id, agentId), eq(agents.tenantId, tenantId)))
    .returning();
  return row ?? null;
}

/**
 * Resuelve el agente del bot legacy, creándolo si falta (idempotente, 5.1, 5.2,
 * P1, P5). El `unique(legacy_bot_id)` y `onConflictDoNothing` + re-select cubren
 * la carrera concurrente: a lo sumo un agente por bot.
 */
export async function resolveAgentForBot(bot: BotRow): Promise<AgentRow> {
  const [existing] = await db
    .select()
    .from(agents)
    .where(eq(agents.legacyBotId, bot.id));
  if (existing) return existing;

  const inserted = await db
    .insert(agents)
    .values({
      tenantId: bot.tenantId,
      createdBy: bot.createdBy,
      name: bot.name,
      status: bot.status,
      model: null, // modelo global hasta que se configure uno propio (2.3)
      extractionSchema: bot.extractionSchema,
      whitelistEnabled: bot.whitelistEnabled,
      handoffMessage: bot.handoffMessage,
      legacyBotId: bot.id,
    })
    .onConflictDoNothing()
    .returning();
  if (inserted[0]) return inserted[0];

  // Otra ejecución concurrente lo creó: re-select.
  const [row] = await db.select().from(agents).where(eq(agents.legacyBotId, bot.id));
  return row!;
}

export type AgentWithChannelCount = AgentRow & { channelCount: number };

/** Adjunta el conteo de canales enlazados a un set de agentes. */
async function withChannelCounts(rows: AgentRow[]): Promise<AgentWithChannelCount[]> {
  if (rows.length === 0) return [];
  const counts = await db
    .select({ agentId: agentChannels.agentId, count: sql<number>`count(*)::int` })
    .from(agentChannels)
    .where(inArray(agentChannels.agentId, rows.map((r) => r.id)))
    .groupBy(agentChannels.agentId);
  const byId = new Map(counts.map((c) => [c.agentId, c.count]));
  return rows.map((r) => ({ ...r, channelCount: byId.get(r.id) ?? 0 }));
}

/**
 * Lista los agentes visibles para el usuario (US-034): admin ve todos los del
 * tenant; member solo los de los bots que tiene asignados (mapeo por
 * `legacy_bot_id`). Agentes creados directamente (sin bot) son admin-only.
 */
export async function listForUser(
  tenantId: string,
  userId: string,
  isAdmin: boolean,
): Promise<AgentWithChannelCount[]> {
  if (isAdmin) {
    const rows = await db.select().from(agents).where(eq(agents.tenantId, tenantId));
    return withChannelCounts(rows);
  }
  const rows = await db
    .select({ agent: agents })
    .from(agents)
    .innerJoin(botAssignments, eq(botAssignments.botId, agents.legacyBotId))
    .where(and(eq(agents.tenantId, tenantId), eq(botAssignments.userId, userId)));
  return withChannelCounts(rows.map((r) => r.agent));
}

/** ¿Puede el usuario ver/operar este agente? Admin: todos; member: asignado. */
export async function canAccessAgent(
  tenantId: string,
  agentId: string,
  userId: string,
  isAdmin: boolean,
): Promise<AgentRow | null> {
  const agent = await getForTenant(tenantId, agentId);
  if (!agent) return null;
  if (isAdmin) return agent;
  if (!agent.legacyBotId) return null; // sin bot → no asignable a member
  const [assigned] = await db
    .select({ id: botAssignments.id })
    .from(botAssignments)
    .where(and(eq(botAssignments.botId, agent.legacyBotId), eq(botAssignments.userId, userId)));
  return assigned ? agent : null;
}
