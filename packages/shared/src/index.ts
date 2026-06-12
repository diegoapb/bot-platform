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
  // Lista blanca activa: el bot solo atiende números con regla `allow`.
  whitelistEnabled: z.boolean(),
  // E12: esquema de extracción de información estructurada (null = desactivada).
  extractionSchema: z.record(z.unknown()).nullable().optional(),
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
    whitelistEnabled: z.boolean(),
  })
  .partial();
export type UpdateBotInput = z.infer<typeof updateBotSchema>;

// --- Reglas de audiencia: lista blanca / negra de teléfonos ------------------

export const phoneRuleKindSchema = z.enum(["allow", "block"]);
export type PhoneRuleKind = z.infer<typeof phoneRuleKindSchema>;

export const phoneRuleSchema = z.object({
  id: z.string().uuid(),
  botId: z.string().uuid(),
  phoneE164: z.string(),
  kind: phoneRuleKindSchema,
  note: z.string().nullable(),
  createdAt: z.string(),
});
export type PhoneRule = z.infer<typeof phoneRuleSchema>;

/** Alta de regla: `phone` se normaliza a E.164 en el backend. */
export const createPhoneRuleSchema = z.object({
  phone: z.string().min(7).max(20),
  kind: phoneRuleKindSchema,
  note: z.string().max(200).optional(),
});
export type CreatePhoneRuleInput = z.infer<typeof createPhoneRuleSchema>;

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

// --- Base de conocimiento (E05 / US-009) -----------------------------------

export const knowledgeSourceKindSchema = z.enum(["text", "file", "faq"]);
export type KnowledgeSourceKind = z.infer<typeof knowledgeSourceKindSchema>;

export const knowledgeSourceStatusSchema = z.enum(["pending", "indexing", "ready", "failed"]);
export type KnowledgeSourceStatus = z.infer<typeof knowledgeSourceStatusSchema>;

export const knowledgeSourceSchema = z.object({
  id: z.string().uuid(),
  kind: knowledgeSourceKindSchema,
  title: z.string(),
  status: knowledgeSourceStatusSchema,
  error: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type KnowledgeSource = z.infer<typeof knowledgeSourceSchema>;

export const createTextSourceSchema = z.object({
  kind: z.literal("text"),
  title: z.string().min(1),
  content: z.string().min(1),
});
export const createFaqSourceSchema = z.object({
  kind: z.literal("faq"),
  question: z.string().min(1),
  answer: z.string().min(1),
});
export const createSourceSchema = z.discriminatedUnion("kind", [
  createTextSourceSchema,
  createFaqSourceSchema,
]);
export type CreateSourceInput = z.infer<typeof createSourceSchema>;

export const knowledgeSearchSchema = z.object({
  query: z.string().min(1),
  k: z.number().int().min(1).max(20).optional(),
});
export type KnowledgeSearchInput = z.infer<typeof knowledgeSearchSchema>;

export const scoredChunkSchema = z.object({
  content: z.string(),
  score: z.number(),
  sourceId: z.string(),
});
export type ScoredChunk = z.infer<typeof scoredChunkSchema>;

// --- Catálogo (E05 / US-010) -------------------------------------------------

export const catalogAvailabilitySchema = z.enum(["available", "unavailable", "on_request"]);
export type CatalogAvailability = z.infer<typeof catalogAvailabilitySchema>;

/** Monedas ISO 4217 habituales en la región (ampliable). */
export const CURRENCIES = ["COP", "USD", "EUR", "MXN", "PEN", "CLP", "ARS", "BRL"] as const;
export const currencySchema = z.enum(CURRENCIES);

export const catalogItemInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional().default(null),
  // string para evitar floats binarios; validado como decimal >= 0 (P3).
  price: z.string().regex(/^\d{1,10}(\.\d{1,2})?$/, "Precio inválido (decimal >= 0)"),
  currency: currencySchema,
  availability: catalogAvailabilitySchema.default("available"),
  attributes: z.record(z.string()).default({}),
});
export type CatalogItemInput = z.infer<typeof catalogItemInputSchema>;

export const updateCatalogItemSchema = catalogItemInputSchema.partial();
export type UpdateCatalogItemInput = z.infer<typeof updateCatalogItemSchema>;

export const catalogItemSchema = z.object({
  id: z.string().uuid(),
  botId: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  price: z.string(),
  currency: z.string(),
  availability: catalogAvailabilitySchema,
  attributes: z.record(z.string()),
  archivedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type CatalogItem = z.infer<typeof catalogItemSchema>;

export const importReportSchema = z.object({
  created: z.number().int(),
  rejected: z.array(z.object({ row: z.number().int(), reason: z.string() })),
});
export type ImportReport = z.infer<typeof importReportSchema>;

// --- Motor conversacional (E06 / US-011, US-012) ------------------------------

export const conversationModeSchema = z.enum(["bot", "human", "paused"]);
export type ConversationMode = z.infer<typeof conversationModeSchema>;

export const setConversationModeSchema = z.object({
  mode: conversationModeSchema,
});
export type SetConversationModeInput = z.infer<typeof setConversationModeSchema>;

export const conversationSummarySchema = z.object({
  id: z.string().uuid(),
  botId: z.string().uuid(),
  mode: conversationModeSchema,
  phoneE164: z.string(),
  lastMsgAt: z.string(),
  createdAt: z.string(),
});
export type ConversationSummary = z.infer<typeof conversationSummarySchema>;

export const conversationTransitionSchema = z.object({
  id: z.string().uuid(),
  fromMode: conversationModeSchema,
  toMode: conversationModeSchema,
  cause: z.string(),
  actorId: z.string().nullable(),
  createdAt: z.string(),
});
export type ConversationTransition = z.infer<typeof conversationTransitionSchema>;

// --- Memoria por cliente (E07 / US-013) ---------------------------------------

export const factOriginSchema = z.enum(["bot", "human"]);
export type FactOrigin = z.infer<typeof factOriginSchema>;

export const contactFactSchema = z.object({
  key: z.string(),
  value: z.string(),
  origin: factOriginSchema,
  updatedAt: z.string(),
});
export type ContactFact = z.infer<typeof contactFactSchema>;

export const contactMemorySchema = z.object({
  facts: z.array(contactFactSchema),
  summary: z.string().nullable(),
  updatedAt: z.string().nullable(),
});
export type ContactMemory = z.infer<typeof contactMemorySchema>;

export const upsertFactSchema = z.object({
  key: z.string().min(1).max(100),
  value: z.string().min(1).max(500),
});
export type UpsertFactInput = z.infer<typeof upsertFactSchema>;

export const contactSummarySchema = z.object({
  channelLinkId: z.string().uuid(),
  phoneE164: z.string(),
  factsCount: z.number().int(),
  hasSummary: z.boolean(),
  memoryUpdatedAt: z.string().nullable(),
});
export type ContactSummary = z.infer<typeof contactSummarySchema>;

export const MEMORY_SUMMARY_MAX_CHARS = 2000;

// --- Activación global del bot (E10 / US-019, US-020) -------------------------

/** Activa/pausa el bot a nivel global: pausado no genera respuestas automáticas. */
export const setBotActivationSchema = z.object({
  active: z.boolean(),
});
export type SetBotActivationInput = z.infer<typeof setBotActivationSchema>;

export const botStatusTransitionSchema = z.object({
  id: z.string().uuid(),
  fromStatus: botStatusSchema,
  toStatus: botStatusSchema,
  cause: z.string(),
  actorId: z.string().nullable(),
  createdAt: z.string(),
});
export type BotStatusTransition = z.infer<typeof botStatusTransitionSchema>;

// --- Canales multicanal vía Chatwoot (E11 / US-021..026) ----------------------

/**
 * Tipos de canal gestionados como inbox nativo de Chatwoot. El WhatsApp vía
 * Evolution (E02) se expone como canal virtual `whatsapp_evolution` en la API
 * de canales, pero su ciclo de vida sigue en /connection.
 */
export const channelTypeSchema = z.enum([
  "telegram",
  "whatsapp_cloud",
  "instagram",
  "messenger",
]);
export type ChannelType = z.infer<typeof channelTypeSchema>;

export const channelStatusSchema = z.enum(["connected", "disconnected", "error"]);
export type ChannelStatus = z.infer<typeof channelStatusSchema>;

/** Vista de un canal para el dashboard. Las credenciales nunca viajan al frontend. */
export const channelSchema = z.object({
  id: z.string(),
  type: z.union([channelTypeSchema, z.literal("whatsapp_evolution")]),
  status: z.union([channelStatusSchema, z.literal("qr")]),
  displayName: z.string().nullable(),
  error: z.string().nullable(),
  // Canal virtual de Evolution: se gestiona desde la pestaña WhatsApp.
  virtual: z.boolean().default(false),
  createdAt: z.string().nullable(),
});
export type Channel = z.infer<typeof channelSchema>;

export const connectTelegramSchema = z.object({
  type: z.literal("telegram"),
  botToken: z.string().min(20),
});
export const connectWhatsappCloudSchema = z.object({
  type: z.literal("whatsapp_cloud"),
  phoneNumber: z.string().min(7),
  phoneNumberId: z.string().min(1),
  businessAccountId: z.string().min(1),
  apiKey: z.string().min(10),
});
export const connectMetaPageSchema = z.object({
  type: z.union([z.literal("instagram"), z.literal("messenger")]),
  pageId: z.string().min(1),
  userAccessToken: z.string().min(10),
  pageAccessToken: z.string().min(10),
  pageName: z.string().min(1),
});
export const connectChannelSchema = z.discriminatedUnion("type", [
  connectTelegramSchema,
  connectWhatsappCloudSchema,
  connectMetaPageSchema.extend({ type: z.literal("instagram") }),
  connectMetaPageSchema.extend({ type: z.literal("messenger") }),
]);
export type ConnectChannelInput = z.infer<typeof connectChannelSchema>;

// --- Extracción de información estructurada (E12 / US-027..029) ---------------

export {
  validateExtractionSchema,
  validateDataAgainstSchema,
  sanitizeAgainstSchema,
  type ExtractionSchema,
  type ExtractionField,
  type ExtractionFieldType,
} from "./extraction.js";

export const saveExtractionSchemaSchema = z.object({
  // null desactiva la extracción; el objeto se valida con validateExtractionSchema.
  schema: z.record(z.unknown()).nullable(),
});
export type SaveExtractionSchemaInput = z.infer<typeof saveExtractionSchemaSchema>;

export const extractedDataSchema = z.object({
  data: z.record(z.unknown()),
  manualKeys: z.array(z.string()),
  provenance: z.record(
    z.object({ source: z.enum(["bot", "human"]), at: z.string() }),
  ),
  updatedAt: z.string().nullable(),
});
export type ExtractedData = z.infer<typeof extractedDataSchema>;

export const updateExtractedDataSchema = z.object({
  data: z.record(z.unknown()),
});
export type UpdateExtractedDataInput = z.infer<typeof updateExtractedDataSchema>;

/** Esquema de ejemplo que se ofrece al activar la extracción por primera vez. */
export const EXTRACTION_SCHEMA_EXAMPLE = {
  type: "object",
  properties: {
    nombre: { type: "string", description: "Nombre del cliente" },
    interes: { type: "string", description: "Producto o servicio que busca" },
    presupuesto: { type: "number", description: "Presupuesto aproximado" },
    listo_para_comprar: { type: "boolean", description: "¿Mostró intención clara de compra?" },
    etiquetas: { type: "array", description: "Temas mencionados (lista de strings)" },
  },
  required: ["nombre"],
} as const;
