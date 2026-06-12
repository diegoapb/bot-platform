import { Hono } from "hono";
import { and, eq } from "drizzle-orm";
import { connectChannelSchema } from "@bot/shared";
import { db } from "../db/client.js";
import { bots, botAssignments, type BotRow } from "../db/schema.js";
import { requireAuth, requireTenant, requireAdmin, ADMIN_ROLE } from "../middleware/auth.js";
import {
  ChannelError,
  connectChannel,
  disconnectChannel,
  listChannels,
} from "../services/channels.js";
import { ChatwootError } from "../integrations/chatwoot.js";

/**
 * Gestión de canales del bot (E11/US-026): listar, conectar y desconectar.
 * Las credenciales solo viajan en el connect; nunca se devuelven.
 */
export const channelsRoutes = new Hono();
channelsRoutes.use("*", requireAuth, requireTenant);

async function getTenantBot(c: any, botId: string): Promise<BotRow | null> {
  const tenantId = c.get("tenantId")!;
  const [bot] = await db
    .select()
    .from(bots)
    .where(and(eq(bots.id, botId), eq(bots.tenantId, tenantId)));
  if (!bot) return null;
  if (c.get("tenantRole") !== ADMIN_ROLE) {
    const [assigned] = await db
      .select({ id: botAssignments.id })
      .from(botAssignments)
      .where(and(eq(botAssignments.botId, botId), eq(botAssignments.userId, c.get("userId"))));
    if (!assigned) return null;
  }
  return bot;
}

/** Canales del bot (incluye el canal virtual WhatsApp/Evolution). */
channelsRoutes.get("/:id/channels", async (c) => {
  const bot = await getTenantBot(c, c.req.param("id"));
  if (!bot) return c.json({ ok: false, error: "No encontrado" }, 404);
  return c.json({ ok: true, data: await listChannels(bot) });
});

/** Conecta un canal nuevo. Solo admin. */
channelsRoutes.post("/:id/channels", requireAdmin, async (c) => {
  const bot = await getTenantBot(c, c.req.param("id"));
  if (!bot) return c.json({ ok: false, error: "No encontrado" }, 404);

  const body = await c.req.json().catch(() => null);
  const parsed = connectChannelSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ ok: false, error: "Payload inválido", issues: parsed.error.issues }, 400);
  }

  try {
    const row = await connectChannel(bot, parsed.data, c.get("userId"));
    return c.json(
      {
        ok: true,
        data: {
          id: row.id,
          type: row.type,
          status: row.status,
          displayName: row.displayName,
          error: row.error,
          virtual: false,
          createdAt: row.createdAt.toISOString(),
        },
      },
      201,
    );
  } catch (e) {
    if (e instanceof ChannelError) return c.json({ ok: false, error: e.message }, 422);
    if (e instanceof ChatwootError) {
      console.error("[channels:connect]", e);
      return c.json({ ok: false, error: "Chatwoot no disponible. Reintenta." }, 502);
    }
    throw e;
  }
});

/** Desconecta un canal. Solo admin. */
channelsRoutes.delete("/:id/channels/:channelId", requireAdmin, async (c) => {
  const bot = await getTenantBot(c, c.req.param("id"));
  if (!bot) return c.json({ ok: false, error: "No encontrado" }, 404);
  const row = await disconnectChannel(bot, c.req.param("channelId"));
  if (!row) return c.json({ ok: false, error: "Canal no encontrado" }, 404);
  return c.json({ ok: true, data: { id: row.id, status: row.status } });
});
