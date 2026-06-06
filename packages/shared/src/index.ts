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
