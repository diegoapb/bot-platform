import { z } from "zod";

/**
 * Tipos y schemas compartidos entre backend (Hono) y frontend (React).
 * Mantener aquí cualquier contrato de API para tener una sola fuente de verdad.
 */

// --- Bots ---------------------------------------------------------------

export const botChannelSchema = z.enum(["whatsapp"]);
export type BotChannel = z.infer<typeof botChannelSchema>;

export const botStatusSchema = z.enum(["draft", "active", "paused"]);
export type BotStatus = z.infer<typeof botStatusSchema>;

export const botSchema = z.object({
  id: z.string().uuid(),
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
