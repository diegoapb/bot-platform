import { z } from "zod";

/**
 * Tipos y schemas compartidos entre backend (Hono) y frontend (React).
 * Mantener aquí cualquier contrato de API para tener una sola fuente de verdad.
 */

// --- Multitenancy (Clerk Organizations) ---------------------------------

/**
 * El tenant es una Organización de Clerk. Roles nativos de Clerk:
 *  - "org:admin"  → administrador del tenant (crea bots, gestiona usuarios)
 *  - "org:member" → usuario que gestiona los bots que le asignen
 */
export const tenantRoleSchema = z.enum(["org:admin", "org:member"]);
export type TenantRole = z.infer<typeof tenantRoleSchema>;

/** Identidad del usuario autenticado + contexto de tenant activo. */
export const meSchema = z.object({
  userId: z.string(),
  tenantId: z.string().nullable(),
  role: tenantRoleSchema.nullable(),
  isAdmin: z.boolean(),
  // Rol de plataforma (por encima de los tenants): crea/bloquea organizaciones.
  isSuperAdmin: z.boolean(),
});
export type Me = z.infer<typeof meSchema>;

/** Miembro del tenant (derivado de la membership de la organización en Clerk). */
export const tenantMemberSchema = z.object({
  userId: z.string(),
  name: z.string(),
  email: z.string(),
  role: tenantRoleSchema,
  imageUrl: z.string().nullable(),
});
export type TenantMember = z.infer<typeof tenantMemberSchema>;

// --- Plataforma / super admin ------------------------------------------

/** Vista de un tenant (organización) en el dashboard de super admin. */
export const adminTenantSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string().nullable(),
  imageUrl: z.string().nullable(),
  membersCount: z.number().int(),
  botsCount: z.number().int(),
  blocked: z.boolean(),
  blockedReason: z.string().nullable(),
  createdAt: z.string(),
});
export type AdminTenant = z.infer<typeof adminTenantSchema>;

export const createTenantSchema = z.object({
  name: z.string().min(1),
  slug: z.string().optional(),
});
export type CreateTenantInput = z.infer<typeof createTenantSchema>;

export const blockTenantSchema = z.object({
  reason: z.string().optional(),
});
export type BlockTenantInput = z.infer<typeof blockTenantSchema>;

// --- Bots ---------------------------------------------------------------

export const botChannelSchema = z.enum(["whatsapp"]);
export type BotChannel = z.infer<typeof botChannelSchema>;

export const botStatusSchema = z.enum(["draft", "active", "paused"]);
export type BotStatus = z.infer<typeof botStatusSchema>;

export const botSchema = z.object({
  id: z.string().uuid(),
  // Organización (tenant) dueña del bot.
  tenantId: z.string(),
  // Clerk user id de quien lo creó.
  createdBy: z.string(),
  name: z.string().min(1),
  channel: botChannelSchema,
  status: botStatusSchema,
  // Nombre de la instancia en Evolution API que atiende este bot.
  evolutionInstance: z.string().nullable(),
  // Estado de la conexión WhatsApp de la instancia.
  connectionStatus: z.enum(["disconnected", "qr", "connected"]),
  lastConnectedAt: z.string().nullable(),
  // ID del inbox de Chatwoot asociado (si se enruta a soporte humano).
  chatwootInboxId: z.number().int().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Bot = z.infer<typeof botSchema>;

export const createBotSchema = botSchema.pick({
  name: true,
  channel: true,
  evolutionInstance: true,
  chatwootInboxId: true,
});
export type CreateBotInput = z.infer<typeof createBotSchema>;

export const updateBotSchema = z
  .object({
    name: z.string().min(1),
    status: botStatusSchema,
    evolutionInstance: z.string().nullable(),
    chatwootInboxId: z.number().int().nullable(),
  })
  .partial();
export type UpdateBotInput = z.infer<typeof updateBotSchema>;

// --- Asignaciones bot ↔ usuario ----------------------------------------

/** Un miembro queda habilitado para gestionar un bot concreto. */
export const botAssignmentSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string(),
  botId: z.string().uuid(),
  userId: z.string(),
  createdAt: z.string(),
});
export type BotAssignment = z.infer<typeof botAssignmentSchema>;

export const createAssignmentSchema = z.object({
  botId: z.string().uuid(),
  userId: z.string(),
});
export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;

// --- Webhooks entrantes -------------------------------------------------

/** Evento mínimo de mensaje normalizado, venga de Evolution o Chatwoot. */
export const inboundMessageSchema = z.object({
  source: z.enum(["evolution", "chatwoot"]),
  instanceOrInbox: z.string(),
  from: z.string(),
  text: z.string().nullable(),
  raw: z.unknown(),
});
export type InboundMessage = z.infer<typeof inboundMessageSchema>;

// --- Helpers de respuesta API ------------------------------------------

export type ApiOk<T> = { ok: true; data: T };
export type ApiErr = { ok: false; error: string };
export type ApiResult<T> = ApiOk<T> | ApiErr;

// --- Conexión WhatsApp (E02) ---------------------------------------------

export const connectionStatusSchema = z.enum(["disconnected", "qr", "connected"]);
export type ConnectionStatus = z.infer<typeof connectionStatusSchema>;

/** Estado de conexión del bot que consume el frontend (QR efímero, no se persiste). */
export const botConnectionSchema = z.object({
  status: connectionStatusSchema,
  qr: z.string().nullable(),
  lastConnectedAt: z.string().nullable(),
});
export type BotConnection = z.infer<typeof botConnectionSchema>;

// --- Chatwoot (E03) -------------------------------------------------------

export const chatwootProvisionSchema = z.object({
  accountId: z.number().int(),
  inboxId: z.number().int(),
  dashboardUrl: z.string(),
});
export type ChatwootProvision = z.infer<typeof chatwootProvisionSchema>;

export const addChatwootAgentSchema = z.object({
  userId: z.string().min(1),
});
export type AddChatwootAgentInput = z.infer<typeof addChatwootAgentSchema>;

// --- Identidad del agente (E04) --------------------------------------------

export const IDENTITY_TYPES = ["SOUL", "IDENTITY", "GUARDRAILS"] as const;
export const identityTypeSchema = z.enum(IDENTITY_TYPES);
export type IdentityType = z.infer<typeof identityTypeSchema>;

export const IDENTITY_MAX_CHARS = 20_000;

export const saveIdentitySchema = z.object({
  content: z.string().max(IDENTITY_MAX_CHARS),
});
export type SaveIdentityInput = z.infer<typeof saveIdentitySchema>;

export const identityDocSchema = z.object({
  type: identityTypeSchema,
  version: z.number().int(),
  content: z.string(),
  createdBy: z.string(),
  createdAt: z.string(),
});
export type IdentityDoc = z.infer<typeof identityDocSchema>;

export const identityVersionSchema = identityDocSchema.omit({ type: true });
export type IdentityVersion = z.infer<typeof identityVersionSchema>;

export { IDENTITY_TEMPLATES } from "./identity-templates.js";
