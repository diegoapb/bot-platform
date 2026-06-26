import { and, eq } from "drizzle-orm";
import { db } from "../db/client.js";
import {
  agentChannels,
  agents,
  channels,
  type AgentRow,
  type ChannelRow,
} from "../db/schema.js";

/**
 * Enlace N:M agente ↔ canal (E13/US-031). En fase 1 un canal pertenece a lo sumo
 * a un agente (invariante por `unique(channel_id)`). Todo opera con aislamiento
 * por tenant (P4). El ruteo de inbound resuelve el agente a partir del canal.
 */

export type AgentChannelErrorCode =
  | "agent_not_found"
  | "channel_not_found"
  | "cross_tenant"
  | "channel_already_assigned";

export class AgentChannelError extends Error {
  constructor(public code: AgentChannelErrorCode, message?: string) {
    super(message ?? code);
  }
}

/** Asigna un canal libre a un agente (1.1–1.5, 2.1). Idempotente si ya es suyo. */
export async function assignChannel(
  tenantId: string,
  agentId: string,
  channelId: string,
): Promise<void> {
  const [agent] = await db
    .select({ id: agents.id, tenantId: agents.tenantId })
    .from(agents)
    .where(eq(agents.id, agentId));
  if (!agent) throw new AgentChannelError("agent_not_found");
  if (agent.tenantId !== tenantId) throw new AgentChannelError("cross_tenant");

  const [channel] = await db
    .select({ id: channels.id, tenantId: channels.tenantId })
    .from(channels)
    .where(eq(channels.id, channelId));
  if (!channel) throw new AgentChannelError("channel_not_found");
  if (channel.tenantId !== tenantId) throw new AgentChannelError("cross_tenant");

  const [existing] = await db
    .select({ agentId: agentChannels.agentId })
    .from(agentChannels)
    .where(eq(agentChannels.channelId, channelId));
  if (existing) {
    if (existing.agentId === agentId) return; // 1.4 idempotente
    throw new AgentChannelError("channel_already_assigned"); // 1.2, 2.1
  }

  await db
    .insert(agentChannels)
    .values({ tenantId, agentId, channelId })
    .onConflictDoNothing(); // carrera concurrente: unique(channel_id) aborta la 2ª
}

/** Desasigna un canal de un agente (3.1, 3.2). */
export async function unassignChannel(
  tenantId: string,
  agentId: string,
  channelId: string,
): Promise<void> {
  await db
    .delete(agentChannels)
    .where(
      and(
        eq(agentChannels.tenantId, tenantId),
        eq(agentChannels.agentId, agentId),
        eq(agentChannels.channelId, channelId),
      ),
    );
}

/** Canales enlazados a un agente (2.2, 6.1). */
export async function listChannelsForAgent(
  tenantId: string,
  agentId: string,
): Promise<ChannelRow[]> {
  const rows = await db
    .select({ channel: channels })
    .from(agentChannels)
    .innerJoin(channels, eq(channels.id, agentChannels.channelId))
    .where(and(eq(agentChannels.tenantId, tenantId), eq(agentChannels.agentId, agentId)));
  return rows.map((r) => r.channel);
}

/** Agente enlazado a un canal, a lo sumo uno (2.3, 4.1). null si libre (4.4). */
export async function resolveAgentForChannel(
  tenantId: string,
  channelId: string,
): Promise<AgentRow | null> {
  const [row] = await db
    .select({ agent: agents })
    .from(agentChannels)
    .innerJoin(agents, eq(agents.id, agentChannels.agentId))
    .where(and(eq(agentChannels.tenantId, tenantId), eq(agentChannels.channelId, channelId)));
  return row?.agent ?? null;
}

/** Todos los canales del tenant con el agente al que están enlazados (o null). */
export async function listTenantChannelsWithLink(
  tenantId: string,
): Promise<Array<ChannelRow & { linkedAgentId: string | null }>> {
  const rows = await db
    .select({ channel: channels, linkedAgentId: agentChannels.agentId })
    .from(channels)
    .leftJoin(agentChannels, eq(agentChannels.channelId, channels.id))
    .where(eq(channels.tenantId, tenantId));
  return rows.map((r) => ({ ...r.channel, linkedAgentId: r.linkedAgentId ?? null }));
}
