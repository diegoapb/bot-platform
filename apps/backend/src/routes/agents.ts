import { Hono } from "hono";
import {
  createAgentSchema,
  updateAgentSchema,
  identityTypeSchema,
  saveIdentitySchema,
  type Agent,
  type AgentChannel,
  type IdentityType,
} from "@bot/shared";
import { db } from "../db/client.js";
import { type AgentRow, type ChannelRow } from "../db/schema.js";
import { requireAuth, requireTenant, requireAdmin, ADMIN_ROLE } from "../middleware/auth.js";
import * as agentsService from "../services/agents.js";
import * as identity from "../services/identity.js";
import * as collections from "../services/collections.js";
import {
  assignChannel,
  unassignChannel,
  listChannelsForAgent,
  listTenantChannelsWithLink,
  AgentChannelError,
} from "../services/agent-channels.js";

/**
 * API de agentes (E13). El agente es el "cerebro" desacoplado del transporte.
 * Reúne CRUD + identidad versionada + modelo (US-030), asignación N:M de canales
 * (US-031) y enlace de colecciones de conocimiento (US-032). La consume la UI de
 * US-034. Escritura: solo `org:admin`; lectura: admin o miembro asignado.
 */
export const agentsRoutes = new Hono();
agentsRoutes.use("*", requireAuth, requireTenant);

function isAdmin(c: any) {
  return c.get("tenantRole") === ADMIN_ROLE;
}

/** DTO del agente (sin handoffMessage/legacyBotId internos). */
function toAgentDto(a: AgentRow, channelCount?: number): Agent {
  return {
    id: a.id,
    tenantId: a.tenantId,
    createdBy: a.createdBy,
    name: a.name,
    status: a.status,
    model: a.model,
    whitelistEnabled: a.whitelistEnabled,
    extractionSchema: (a.extractionSchema as Record<string, unknown> | null) ?? null,
    ...(channelCount !== undefined ? { channelCount } : {}),
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  };
}

/** Canal → DTO seguro (sin credenciales). */
function toChannelDto(ch: ChannelRow & { linkedAgentId?: string | null }): AgentChannel {
  return {
    id: ch.id,
    type: ch.type,
    status: ch.status,
    displayName: ch.displayName,
    linkedAgentId: ch.linkedAgentId ?? null,
  };
}

/** Resuelve el agente accesible o responde 404/403. Devuelve null si ya respondió. */
async function loadAccessibleAgent(c: any): Promise<AgentRow | null> {
  const agent = await agentsService.canAccessAgent(
    c.get("tenantId")!,
    c.req.param("id"),
    c.get("userId"),
    isAdmin(c),
  );
  return agent;
}

// --- CRUD (US-030) ----------------------------------------------------------

/** Lista agentes visibles. Admin → todos; member → asignados (1.1, 1.4, 6.3). */
agentsRoutes.get("/", async (c) => {
  const rows = await agentsService.listForUser(c.get("tenantId")!, c.get("userId"), isAdmin(c));
  return c.json({ ok: true, data: rows.map((r) => toAgentDto(r, r.channelCount)) });
});

/** Crea un agente. Solo admin (2.1–2.3). */
agentsRoutes.post("/", requireAdmin, async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = createAgentSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ ok: false, error: "El nombre es obligatorio", issues: parsed.error.issues }, 422);
  }
  const agent = await agentsService.create(c.get("tenantId")!, { name: parsed.data.name }, c.get("userId"));
  return c.json({ ok: true, data: toAgentDto(agent, 0) }, 201);
});

/** Detalle del agente (3.1, 6.4). Admin o miembro asignado. */
agentsRoutes.get("/:id", async (c) => {
  const agent = await loadAccessibleAgent(c);
  if (!agent) return c.json({ ok: false, error: "No encontrado" }, 404);
  const channels = await listChannelsForAgent(c.get("tenantId")!, agent.id);
  return c.json({ ok: true, data: toAgentDto(agent, channels.length) });
});

/** Actualiza modelo/nombre/estado/audiencia. Solo admin (3.4). */
agentsRoutes.patch("/:id", requireAdmin, async (c) => {
  const tenantId = c.get("tenantId")!;
  const body = await c.req.json().catch(() => null);
  const parsed = updateAgentSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ ok: false, error: "Payload inválido", issues: parsed.error.issues }, 422);
  }
  const agent = await agentsService.update(tenantId, c.req.param("id"), parsed.data);
  if (!agent) return c.json({ ok: false, error: "No encontrado" }, 404);
  return c.json({ ok: true, data: toAgentDto(agent) });
});

// --- Identidad por agente (US-030 / US-034 R3) -------------------------------

function parseType(raw: string): IdentityType | null {
  const parsed = identityTypeSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

agentsRoutes.get("/:id/identity", async (c) => {
  const agent = await loadAccessibleAgent(c);
  if (!agent) return c.json({ ok: false, error: "No encontrado" }, 404);
  const current = await identity.getCurrent(agent.id);
  const data = Object.fromEntries(
    Object.entries(current).map(([type, doc]) => [
      type,
      doc
        ? {
            type,
            version: doc.version,
            content: doc.content,
            createdBy: doc.createdBy,
            createdAt: doc.createdAt.toISOString(),
          }
        : null,
    ]),
  );
  return c.json({ ok: true, data });
});

agentsRoutes.put("/:id/identity/:type", requireAdmin, async (c) => {
  const agent = await loadAccessibleAgent(c);
  if (!agent) return c.json({ ok: false, error: "No encontrado" }, 404);
  const type = parseType(c.req.param("type"));
  if (!type) return c.json({ ok: false, error: "Tipo de documento inválido" }, 422);
  const body = await c.req.json().catch(() => null);
  const parsed = saveIdentitySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ ok: false, error: "Contenido inválido (máx 20.000 caracteres)" }, 422);
  }
  const result = await identity.save(c.get("tenantId")!, agent.id, type, parsed.data.content, c.get("userId"));
  return c.json({ ok: true, data: result });
});

agentsRoutes.get("/:id/identity/:type/versions", async (c) => {
  const agent = await loadAccessibleAgent(c);
  if (!agent) return c.json({ ok: false, error: "No encontrado" }, 404);
  const type = parseType(c.req.param("type"));
  if (!type) return c.json({ ok: false, error: "Tipo de documento inválido" }, 422);
  const versions = await identity.listVersions(agent.id, type);
  return c.json({
    ok: true,
    data: versions.map((v) => ({ ...v, createdAt: v.createdAt.toISOString() })),
  });
});

agentsRoutes.post("/:id/identity/:type/versions/:v/restore", requireAdmin, async (c) => {
  const agent = await loadAccessibleAgent(c);
  if (!agent) return c.json({ ok: false, error: "No encontrado" }, 404);
  const type = parseType(c.req.param("type"));
  if (!type) return c.json({ ok: false, error: "Tipo de documento inválido" }, 422);
  const version = Number(c.req.param("v"));
  if (!Number.isInteger(version) || version < 1) {
    return c.json({ ok: false, error: "Versión inválida" }, 422);
  }
  const result = await identity.restore(c.get("tenantId")!, agent.id, type, version, c.get("userId"));
  if (!result) return c.json({ ok: false, error: "Versión no encontrada" }, 404);
  return c.json({ ok: true, data: result });
});

// --- Canales N:M (US-031 / US-034 R4) ---------------------------------------

/** Canales enlazados + disponibles del tenant (4.1). Sin credenciales (P2). */
agentsRoutes.get("/:id/channels", async (c) => {
  const agent = await loadAccessibleAgent(c);
  if (!agent) return c.json({ ok: false, error: "No encontrado" }, 404);
  const all = await listTenantChannelsWithLink(c.get("tenantId")!);
  const linked = all.filter((ch) => ch.linkedAgentId === agent.id).map(toChannelDto);
  const available = all.filter((ch) => ch.linkedAgentId == null).map(toChannelDto);
  return c.json({ ok: true, data: { linked, available } });
});

function mapAgentChannelError(c: any, e: unknown) {
  if (e instanceof AgentChannelError) {
    const status =
      e.code === "channel_already_assigned"
        ? 409
        : e.code === "cross_tenant"
          ? 403
          : 404;
    return c.json({ ok: false, error: e.code }, status);
  }
  throw e;
}

agentsRoutes.post("/:id/channels", requireAdmin, async (c) => {
  const tenantId = c.get("tenantId")!;
  const body = await c.req.json().catch(() => null);
  const channelId = typeof body?.channelId === "string" ? body.channelId : null;
  if (!channelId) return c.json({ ok: false, error: "channelId requerido" }, 422);
  try {
    await assignChannel(tenantId, c.req.param("id"), channelId);
    return c.json({ ok: true, data: { agentId: c.req.param("id"), channelId } });
  } catch (e) {
    return mapAgentChannelError(c, e);
  }
});

agentsRoutes.delete("/:id/channels/:channelId", requireAdmin, async (c) => {
  await unassignChannel(c.get("tenantId")!, c.req.param("id"), c.req.param("channelId"));
  return c.json({ ok: true, data: { channelId: c.req.param("channelId") } });
});

// --- Colecciones de conocimiento (US-032 / US-034 R5) -----------------------

/** Colecciones enlazadas + disponibles del tenant (5.1, 5.4). */
agentsRoutes.get("/:id/collections", async (c) => {
  const agent = await loadAccessibleAgent(c);
  if (!agent) return c.json({ ok: false, error: "No encontrado" }, 404);
  const tenantId = c.get("tenantId")!;
  const [linked, all] = await Promise.all([
    collections.collectionsForAgent(tenantId, agent.id),
    collections.list(tenantId),
  ]);
  const linkedIds = new Set(linked.map((x) => x.id));
  const available = all.filter((x) => !linkedIds.has(x.id));
  return c.json({ ok: true, data: { linked, available } });
});

function mapCollectionError(c: any, e: unknown) {
  if (e instanceof collections.CollectionError) {
    const status = e.code === "cross_tenant" ? 403 : e.code === "not_found" ? 404 : 422;
    return c.json({ ok: false, error: e.message }, status);
  }
  throw e;
}

agentsRoutes.post("/:id/collections", requireAdmin, async (c) => {
  const tenantId = c.get("tenantId")!;
  const body = await c.req.json().catch(() => null);
  const collectionId = typeof body?.collectionId === "string" ? body.collectionId : null;
  if (!collectionId) return c.json({ ok: false, error: "collectionId requerido" }, 422);
  try {
    await collections.linkAgent(tenantId, c.req.param("id"), collectionId);
    return c.json({ ok: true, data: { agentId: c.req.param("id"), collectionId } });
  } catch (e) {
    return mapCollectionError(c, e);
  }
});

agentsRoutes.delete("/:id/collections/:collectionId", requireAdmin, async (c) => {
  await collections.unlinkAgent(c.get("tenantId")!, c.req.param("id"), c.req.param("collectionId"));
  return c.json({ ok: true, data: { collectionId: c.req.param("collectionId") } });
});
