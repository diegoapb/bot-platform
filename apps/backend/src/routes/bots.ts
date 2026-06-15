import { Hono } from "hono";
import { eq, and, desc } from "drizzle-orm";
import {
  createBotSchema,
  updateBotSchema,
  addChatwootAgentSchema,
  createPhoneRuleSchema,
  setBotActivationSchema,
  saveExtractionSchemaSchema,
  validateExtractionSchema,
} from "@bot/shared";
import type { BotConnection } from "@bot/shared";
import { db } from "../db/client.js";
import {
  bots,
  botAssignments,
  botStatusTransitions,
  phoneRules,
  tenants,
  type BotRow,
} from "../db/schema.js";
import { setBotStatus } from "../services/bot-activation.js";
import { requireAuth, requireTenant, requireAdmin, ADMIN_ROLE } from "../middleware/auth.js";
import { evolution, mapConnectionState, EvolutionError } from "../integrations/evolution.js";
import { provisionChatwoot, provisionAgent } from "../services/chatwoot-provisioning.js";
import { clerk } from "../lib/clerk.js";
import { env } from "../env.js";

export const botsRoutes = new Hono();

// Todas las rutas de bots requieren sesión + tenant activo.
botsRoutes.use("*", requireAuth, requireTenant);

function isAdmin(role: string | null) {
  return role === ADMIN_ROLE;
}

/** Bot del tenant actual, o null. Members necesitan asignación. */
async function getTenantBot(c: any, botId: string): Promise<BotRow | null> {
  const tenantId = c.get("tenantId")!;
  const [bot] = await db
    .select()
    .from(bots)
    .where(and(eq(bots.id, botId), eq(bots.tenantId, tenantId)));
  if (!bot) return null;
  if (!isAdmin(c.get("tenantRole"))) {
    const [assigned] = await db
      .select({ id: botAssignments.id })
      .from(botAssignments)
      .where(and(eq(botAssignments.botId, botId), eq(botAssignments.userId, c.get("userId"))));
    if (!assigned) return null;
  }
  return bot;
}

/** Lista bots del tenant. Admin → todos; member → solo los asignados. */
botsRoutes.get("/", async (c) => {
  const tenantId = c.get("tenantId")!;
  const userId = c.get("userId");

  if (isAdmin(c.get("tenantRole"))) {
    const rows = await db.select().from(bots).where(eq(bots.tenantId, tenantId));
    return c.json({ ok: true, data: rows });
  }

  const rows = await db
    .select({ bot: bots })
    .from(bots)
    .innerJoin(botAssignments, eq(botAssignments.botId, bots.id))
    .where(and(eq(bots.tenantId, tenantId), eq(botAssignments.userId, userId)));
  return c.json({ ok: true, data: rows.map((r) => r.bot) });
});

/** Crea un bot en el tenant. Solo admin. */
botsRoutes.post("/", requireAdmin, async (c) => {
  const tenantId = c.get("tenantId")!;
  const body = await c.req.json().catch(() => null);
  const parsed = createBotSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ ok: false, error: "Payload inválido", issues: parsed.error.issues }, 400);
  }
  const [row] = await db
    .insert(bots)
    .values({ ...parsed.data, tenantId, createdBy: c.get("userId") })
    .returning();
  return c.json({ ok: true, data: row }, 201);
});

/** Detalle de un bot. Admin o miembro asignado. */
botsRoutes.get("/:id", async (c) => {
  const tenantId = c.get("tenantId")!;
  const botId = c.req.param("id");

  const [row] = await db
    .select()
    .from(bots)
    .where(and(eq(bots.id, botId), eq(bots.tenantId, tenantId)));
  if (!row) return c.json({ ok: false, error: "No encontrado" }, 404);

  if (!isAdmin(c.get("tenantRole"))) {
    const [assigned] = await db
      .select({ id: botAssignments.id })
      .from(botAssignments)
      .where(and(eq(botAssignments.botId, botId), eq(botAssignments.userId, c.get("userId"))));
    if (!assigned) return c.json({ ok: false, error: "Sin acceso a este bot" }, 403);
  }

  return c.json({ ok: true, data: row });
});

/** Actualiza un bot del tenant. Solo admin. */
botsRoutes.patch("/:id", requireAdmin, async (c) => {
  const tenantId = c.get("tenantId")!;
  const botId = c.req.param("id");
  const body = await c.req.json().catch(() => null);
  const parsed = updateBotSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ ok: false, error: "Payload inválido", issues: parsed.error.issues }, 400);
  }
  const [row] = await db
    .update(bots)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(bots.id, botId), eq(bots.tenantId, tenantId)))
    .returning();
  if (!row) return c.json({ ok: false, error: "No encontrado" }, 404);
  return c.json({ ok: true, data: row });
});

/** Elimina un bot del tenant (y sus asignaciones, en cascada). Solo admin. */
botsRoutes.delete("/:id", requireAdmin, async (c) => {
  const tenantId = c.get("tenantId")!;
  const botId = c.req.param("id");
  const [row] = await db
    .delete(bots)
    .where(and(eq(bots.id, botId), eq(bots.tenantId, tenantId)))
    .returning({ id: bots.id });
  if (!row) return c.json({ ok: false, error: "No encontrado" }, 404);
  return c.json({ ok: true, data: { id: row.id } });
});

// --- Activación global del bot (E10 / US-019) ------------------------------

/**
 * Activa o pausa el bot a nivel global. Pausado: los mensajes siguen llegando
 * a Chatwoot para atención humana, pero el motor no responde. Solo admin.
 */
botsRoutes.post("/:id/activation", requireAdmin, async (c) => {
  const bot = await getTenantBot(c, c.req.param("id"));
  if (!bot) return c.json({ ok: false, error: "No encontrado" }, 404);

  const body = await c.req.json().catch(() => null);
  const parsed = setBotActivationSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ ok: false, error: "Payload inválido", issues: parsed.error.issues }, 400);
  }

  const { bot: updated } = await setBotStatus(
    bot.id,
    parsed.data.active ? "active" : "paused",
    "panel:user",
    c.get("userId"),
  );
  return c.json({ ok: true, data: updated ?? bot });
});

/** Historial de activaciones/pausas del bot (auditoría US-019). */
botsRoutes.get("/:id/activation/history", async (c) => {
  const bot = await getTenantBot(c, c.req.param("id"));
  if (!bot) return c.json({ ok: false, error: "No encontrado" }, 404);
  const rows = await db
    .select()
    .from(botStatusTransitions)
    .where(eq(botStatusTransitions.botId, bot.id))
    .orderBy(desc(botStatusTransitions.createdAt))
    .limit(50);
  return c.json({
    ok: true,
    data: rows.map((r) => ({
      id: r.id,
      fromStatus: r.fromStatus,
      toStatus: r.toStatus,
      cause: r.cause,
      actorId: r.actorId,
      createdAt: r.createdAt.toISOString(),
    })),
  });
});

// --- Conexión WhatsApp (E02 / US-005) ------------------------------------

/** Crea (o reusa) la instancia de Evolution del bot y devuelve el QR. Solo admin. */
botsRoutes.post("/:id/connection", requireAdmin, async (c) => {
  const bot = await getTenantBot(c, c.req.param("id"));
  if (!bot) return c.json({ ok: false, error: "No encontrado" }, 404);

  try {
    let instance = bot.evolutionInstance;
    if (!instance) {
      // Aseguramos el inbox de Chatwoot ANTES de conectar WhatsApp: así ningún
      // bot queda "conectado pero sin provisionar" (sus mensajes se descartarían
      // en message-sync). Es idempotente; si Chatwoot falla, abortamos la
      // conexión con un error visible en vez de dejar el alta a medias.
      try {
        await provisionChatwoot(bot);
      } catch (e) {
        console.error("[chatwoot:provision] (al conectar)", e);
        return c.json(
          { ok: false, error: "Chatwoot no disponible; reintenta antes de conectar WhatsApp." },
          502,
        );
      }

      // 1 bot = 1 instancia; nombre determinístico con prefijo de ambiente
      // (dev-/qa-/prod-) para diferenciar las instancias en el Evolution
      // compartido sin que colisionen (P3). El nombre completo se persiste en
      // bots.evolutionInstance, así findBotByInstance lo resuelve sin cambios.
      instance = `${env.DEPLOY_ENV}-bot-${bot.id}`;
      const webhookUrl = `${env.PUBLIC_WEBHOOK_BASE_URL}/webhooks/evolution/${instance}`;
      await evolution.createInstance(instance, webhookUrl);
      await db
        .update(bots)
        .set({ evolutionInstance: instance, connectionStatus: "qr", updatedAt: new Date() })
        .where(eq(bots.id, bot.id));
    }
    const qr = await evolution.getQr(instance);
    const data: BotConnection = {
      status: qr ? "qr" : bot.connectionStatus,
      qr: qr?.base64 ?? null,
      lastConnectedAt: bot.lastConnectedAt?.toISOString() ?? null,
    };
    return c.json({ ok: true, data });
  } catch (e) {
    if (e instanceof EvolutionError) {
      return c.json({ ok: false, error: "Evolution API no disponible. Reintenta." }, 502);
    }
    throw e;
  }
});

/** Estado de conexión + QR vigente. Admin o miembro asignado. */
botsRoutes.get("/:id/connection", async (c) => {
  const bot = await getTenantBot(c, c.req.param("id"));
  if (!bot) return c.json({ ok: false, error: "No encontrado" }, 404);

  let status = bot.connectionStatus;
  let qr: string | null = null;
  if (bot.evolutionInstance) {
    try {
      status = mapConnectionState(await evolution.connectionState(bot.evolutionInstance));
      if (status !== "connected") {
        qr = (await evolution.getQr(bot.evolutionInstance))?.base64 ?? null;
        if (qr) status = "qr";
      }
      if (status !== bot.connectionStatus) {
        await db
          .update(bots)
          .set({ connectionStatus: status, updatedAt: new Date() })
          .where(eq(bots.id, bot.id));
      }
    } catch {
      // Evolution caído: devolvemos el último estado persistido.
    }
  }
  const data: BotConnection = {
    status,
    qr,
    lastConnectedAt: bot.lastConnectedAt?.toISOString() ?? null,
  };
  return c.json({ ok: true, data });
});

/** Desvincula el número (logout de la instancia). Solo admin. */
botsRoutes.delete("/:id/connection", requireAdmin, async (c) => {
  const bot = await getTenantBot(c, c.req.param("id"));
  if (!bot) return c.json({ ok: false, error: "No encontrado" }, 404);
  if (!bot.evolutionInstance) {
    return c.json({ ok: false, error: "El bot no tiene instancia" }, 400);
  }
  try {
    await evolution.logout(bot.evolutionInstance);
  } catch (e) {
    if (e instanceof EvolutionError && e.status !== 404) {
      return c.json({ ok: false, error: "Evolution API no disponible. Reintenta." }, 502);
    }
  }
  await db
    .update(bots)
    .set({ connectionStatus: "disconnected", updatedAt: new Date() })
    .where(eq(bots.id, bot.id));
  return c.json({ ok: true, data: { status: "disconnected" } });
});

// --- Chatwoot (E03 / US-006) ----------------------------------------------

/** Provisión idempotente de cuenta + inbox de Chatwoot. Solo admin. */
botsRoutes.post("/:id/chatwoot/provision", requireAdmin, async (c) => {
  const bot = await getTenantBot(c, c.req.param("id"));
  if (!bot) return c.json({ ok: false, error: "No encontrado" }, 404);
  try {
    const result = await provisionChatwoot(bot);
    return c.json({ ok: true, data: result });
  } catch (e) {
    console.error("[chatwoot:provision]", e);
    return c.json({ ok: false, error: "Chatwoot no disponible. Reintenta." }, 502);
  }
});

/** Estado de la provisión Chatwoot del bot. */
botsRoutes.get("/:id/chatwoot", async (c) => {
  const bot = await getTenantBot(c, c.req.param("id"));
  if (!bot) return c.json({ ok: false, error: "No encontrado" }, 404);
  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, bot.tenantId));
  const accountId = tenant?.chatwootAccountId ?? null;
  return c.json({
    ok: true,
    data: {
      accountId,
      inboxId: bot.chatwootInboxId,
      dashboardUrl: accountId ? `${env.CHATWOOT_API_URL}/app/accounts/${accountId}` : null,
    },
  });
});

/** Da de alta a un miembro del tenant como agente en Chatwoot. Solo admin. */
botsRoutes.post("/:id/chatwoot/agents", requireAdmin, async (c) => {
  const bot = await getTenantBot(c, c.req.param("id"));
  if (!bot) return c.json({ ok: false, error: "No encontrado" }, 404);

  const body = await c.req.json().catch(() => null);
  const parsed = addChatwootAgentSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ ok: false, error: "Payload inválido", issues: parsed.error.issues }, 400);
  }

  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, bot.tenantId));
  if (!tenant?.chatwootAccountId) {
    return c.json({ ok: false, error: "Provisiona Chatwoot primero" }, 400);
  }

  const user = await clerk.users.getUser(parsed.data.userId);
  const email = user.emailAddresses[0]?.emailAddress;
  if (!email) return c.json({ ok: false, error: "El usuario no tiene email" }, 400);
  const name =
    [user.firstName, user.lastName].filter(Boolean).join(" ") || email.split("@")[0]!;

  try {
    const result = await provisionAgent(tenant.chatwootAccountId, name, email);
    return c.json({ ok: true, data: result });
  } catch (e) {
    console.error("[chatwoot:agents]", e);
    return c.json({ ok: false, error: "Chatwoot no disponible. Reintenta." }, 502);
  }
});

// --- Extracción de información estructurada (E12 / US-027) ------------------

/** Esquema de extracción vigente del bot. */
botsRoutes.get("/:id/extraction-schema", async (c) => {
  const bot = await getTenantBot(c, c.req.param("id"));
  if (!bot) return c.json({ ok: false, error: "No encontrado" }, 404);
  return c.json({ ok: true, data: { schema: bot.extractionSchema ?? null } });
});

/**
 * Guarda (o desactiva con null) el esquema de extracción. Se valida que sea un
 * subset de JSON Schema bien formado; los datos ya extraídos no se tocan.
 */
botsRoutes.put("/:id/extraction-schema", requireAdmin, async (c) => {
  const bot = await getTenantBot(c, c.req.param("id"));
  if (!bot) return c.json({ ok: false, error: "No encontrado" }, 404);

  const body = await c.req.json().catch(() => null);
  const parsed = saveExtractionSchemaSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ ok: false, error: "Payload inválido", issues: parsed.error.issues }, 400);
  }
  if (parsed.data.schema !== null) {
    const errors = validateExtractionSchema(parsed.data.schema);
    if (errors.length > 0) {
      return c.json({ ok: false, error: `Esquema inválido: ${errors.join("; ")}` }, 422);
    }
  }

  const [row] = await db
    .update(bots)
    .set({ extractionSchema: parsed.data.schema, updatedAt: new Date() })
    .where(eq(bots.id, bot.id))
    .returning();
  return c.json({ ok: true, data: { schema: row?.extractionSchema ?? null } });
});

// --- Audiencia: lista blanca / negra de teléfonos --------------------------

/** Normaliza un teléfono a E.164 (`+` + 7..15 dígitos). null si no es válido. */
function normalizePhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (!/^\d{7,15}$/.test(digits)) return null;
  return `+${digits}`;
}

/** Lista las reglas de audiencia del bot. Admin o miembro asignado. */
botsRoutes.get("/:id/phone-rules", async (c) => {
  const bot = await getTenantBot(c, c.req.param("id"));
  if (!bot) return c.json({ ok: false, error: "No encontrado" }, 404);
  const rows = await db.select().from(phoneRules).where(eq(phoneRules.botId, bot.id));
  return c.json({
    ok: true,
    data: rows.map((r) => ({
      id: r.id,
      botId: r.botId,
      phoneE164: r.phoneE164,
      kind: r.kind,
      note: r.note,
      createdAt: r.createdAt.toISOString(),
    })),
  });
});

/** Agrega (o reemplaza) una regla para un teléfono. Solo admin. */
botsRoutes.post("/:id/phone-rules", requireAdmin, async (c) => {
  const bot = await getTenantBot(c, c.req.param("id"));
  if (!bot) return c.json({ ok: false, error: "No encontrado" }, 404);

  const body = await c.req.json().catch(() => null);
  const parsed = createPhoneRuleSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ ok: false, error: "Payload inválido", issues: parsed.error.issues }, 400);
  }
  const phoneE164 = normalizePhone(parsed.data.phone);
  if (!phoneE164) {
    return c.json({ ok: false, error: "Teléfono inválido (usa formato internacional)" }, 400);
  }

  // Un número tiene una sola regla: si ya existe, se actualiza su tipo/nota.
  const [row] = await db
    .insert(phoneRules)
    .values({
      tenantId: bot.tenantId,
      botId: bot.id,
      phoneE164,
      kind: parsed.data.kind,
      note: parsed.data.note ?? null,
      createdBy: c.get("userId"),
    })
    .onConflictDoUpdate({
      target: [phoneRules.botId, phoneRules.phoneE164],
      set: { kind: parsed.data.kind, note: parsed.data.note ?? null },
    })
    .returning();

  return c.json(
    {
      ok: true,
      data: {
        id: row!.id,
        botId: row!.botId,
        phoneE164: row!.phoneE164,
        kind: row!.kind,
        note: row!.note,
        createdAt: row!.createdAt.toISOString(),
      },
    },
    201,
  );
});

/** Elimina una regla de audiencia. Solo admin. */
botsRoutes.delete("/:id/phone-rules/:ruleId", requireAdmin, async (c) => {
  const bot = await getTenantBot(c, c.req.param("id"));
  if (!bot) return c.json({ ok: false, error: "No encontrado" }, 404);
  const [row] = await db
    .delete(phoneRules)
    .where(and(eq(phoneRules.id, c.req.param("ruleId")), eq(phoneRules.botId, bot.id)))
    .returning({ id: phoneRules.id });
  if (!row) return c.json({ ok: false, error: "Regla no encontrada" }, 404);
  return c.json({ ok: true, data: { id: row.id } });
});
