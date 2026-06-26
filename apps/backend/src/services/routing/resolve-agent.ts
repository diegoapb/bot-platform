import { and, eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import {
  agentChannels,
  channels,
  type AgentRow,
  type BotRow,
  type ChannelRow,
} from "../../db/schema.js";
import { resolveAgentForBot } from "../agents.js";
import { resolveAgentForChannel } from "../agent-channels.js";

/**
 * Ruteo de inbound por agente (E13/US-031): a partir del origen del webhook se
 * resuelve el canal y, vía `agent_channels`, el agente que lo atiende. En fase 1
 * el agente es determinístico (el único enlazado al canal). Todo con aislamiento
 * por tenant (P4). Devuelve null si el canal no tiene agente (4.4).
 */

export type ResolvedRoute = { channel: ChannelRow; agent: AgentRow };

/** Inbound por inbox de Chatwoot (canal nativo) → {channel, agent} | null (4.1). */
export async function resolveByInbox(
  tenantId: string,
  inboxId: number,
): Promise<ResolvedRoute | null> {
  const [channel] = await db
    .select()
    .from(channels)
    .where(and(eq(channels.tenantId, tenantId), eq(channels.chatwootInboxId, inboxId)));
  if (!channel) return null;
  const agent = await resolveAgentForChannel(tenantId, channel.id);
  if (!agent) return null;
  return { channel, agent };
}

/**
 * Inbound por instancia de Evolution (4.2). El webhook resuelve el bot por la
 * instancia; aquí normalizamos: garantizamos el agente del bot y su canal legacy
 * `whatsapp_evolution`, y los enlazamos. Self-healing para bots creados después
 * de la migración. El agente se resuelve por el canal (no hardcodeado al bot).
 */
export async function resolveLegacyForBot(bot: BotRow): Promise<ResolvedRoute> {
  const agent = await resolveAgentForBot(bot);

  // Garantiza la fila de canal legacy (idempotente por unique(bot_id, type)).
  let [channel] = await db
    .select()
    .from(channels)
    .where(and(eq(channels.botId, bot.id), eq(channels.type, "whatsapp_evolution")));
  if (!channel) {
    const inserted = await db
      .insert(channels)
      .values({
        tenantId: bot.tenantId,
        botId: bot.id,
        type: "whatsapp_evolution",
        status: bot.connectionStatus === "connected" ? "connected" : "disconnected",
        credentials: bot.evolutionInstance
          ? { evolutionInstance: bot.evolutionInstance }
          : {},
        chatwootInboxId: bot.chatwootInboxId,
        displayName: bot.evolutionInstance,
        createdBy: bot.createdBy,
      })
      .onConflictDoNothing({ target: [channels.botId, channels.type] })
      .returning();
    channel =
      inserted[0] ??
      (
        await db
          .select()
          .from(channels)
          .where(and(eq(channels.botId, bot.id), eq(channels.type, "whatsapp_evolution")))
      )[0]!;
  }

  // Garantiza el enlace canal↔agente (idempotente por unique(channel_id)).
  await db
    .insert(agentChannels)
    .values({ tenantId: bot.tenantId, agentId: agent.id, channelId: channel.id })
    .onConflictDoNothing({ target: agentChannels.channelId });

  // El agente vigente del canal manda (puede diferir si se reasignó en E14).
  const linked = await resolveAgentForChannel(bot.tenantId, channel.id);
  return { channel, agent: linked ?? agent };
}
