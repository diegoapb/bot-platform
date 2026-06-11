import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  pgEnum,
  unique,
  index,
  jsonb,
  numeric,
} from "drizzle-orm/pg-core";

export const botChannel = pgEnum("bot_channel", ["whatsapp"]);
export const botStatus = pgEnum("bot_status", ["draft", "active", "paused"]);
export const connectionStatus = pgEnum("connection_status", [
  "disconnected",
  "qr",
  "connected",
]);
export const webhookSource = pgEnum("webhook_source", ["evolution", "chatwoot"]);
export const identityType = pgEnum("identity_type", ["SOUL", "IDENTITY", "GUARDRAILS"]);
export const knowledgeSourceKind = pgEnum("knowledge_source_kind", ["text", "file", "faq"]);
export const knowledgeSourceStatus = pgEnum("knowledge_source_status", [
  "pending",
  "indexing",
  "ready",
  "failed",
]);
export const catalogAvailability = pgEnum("catalog_availability", [
  "available",
  "unavailable",
  "on_request",
]);
export const conversationMode = pgEnum("conversation_mode", ["bot", "human", "paused"]);
export const factOrigin = pgEnum("fact_origin", ["bot", "human"]);
export const phoneRuleKind = pgEnum("phone_rule_kind", ["allow", "block"]);

/**
 * Estado de plataforma de cada tenant (organización de Clerk). La membresía y
 * los roles viven en Clerk; aquí solo guardamos flags que Clerk no cubre, como
 * el bloqueo de un tenant por parte del super admin. Sin fila => no bloqueado.
 */
export const tenants = pgTable("tenants", {
  // Clerk org id.
  id: text("id").primaryKey(),
  // Nombre cacheado (solo para mostrar; la fuente de verdad es Clerk).
  name: text("name"),
  blocked: boolean("blocked").notNull().default(false),
  blockedReason: text("blocked_reason"),
  // Cuenta de Chatwoot provisionada para este tenant (Platform API).
  chatwootAccountId: integer("chatwoot_account_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type TenantRow = typeof tenants.$inferSelect;
export type NewTenantRow = typeof tenants.$inferInsert;

/**
 * Multitenancy vía Clerk Organizations: el tenant es la organización de Clerk
 * (`tenantId` = org id) y los roles viven en Clerk ("org:admin" / "org:member").
 * Aquí guardamos solo los datos de negocio scopeados por tenant.
 *
 * Un "bot" = configuración que conecta una instancia de Evolution API (WhatsApp)
 * con, opcionalmente, un inbox de Chatwoot para escalado humano.
 */
export const bots = pgTable(
  "bots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Organización (tenant) dueña del bot — Clerk org id.
    tenantId: text("tenant_id").notNull(),
    // Clerk user id de quien lo creó.
    createdBy: text("created_by").notNull(),
    name: text("name").notNull(),
    channel: botChannel("channel").notNull().default("whatsapp"),
    status: botStatus("status").notNull().default("draft"),
    evolutionInstance: text("evolution_instance"),
    connectionStatus: connectionStatus("connection_status").notNull().default("disconnected"),
    lastConnectedAt: timestamp("last_connected_at", { withTimezone: true }),
    chatwootInboxId: integer("chatwoot_inbox_id"),
    // Identifier (token) del inbox API de Chatwoot. Secreto: nunca al frontend.
    chatwootInboxIdentifier: text("chatwoot_inbox_identifier"),
    // Token por bot para validar el webhook entrante de Chatwoot.
    chatwootWebhookToken: text("chatwoot_webhook_token"),
    // Si está activo, el bot solo atiende a números con regla `allow` (lista
    // blanca). Si está inactivo, atiende a todos salvo los `block` (lista negra).
    whitelistEnabled: boolean("whitelist_enabled").notNull().default(false),
    // Plantilla que el bot envía al cliente cuando transfiere a un humano (E06/US-012).
    handoffMessage: text("handoff_message")
      .notNull()
      .default("Te comunico con una persona del equipo, en breve te atienden."),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    byTenant: index("bots_tenant_idx").on(t.tenantId),
  }),
);

/**
 * Asignación de un miembro del tenant a un bot concreto. Los admin gestionan
 * todos los bots del tenant; los members solo los que tengan asignados aquí.
 */
export const botAssignments = pgTable(
  "bot_assignments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: text("tenant_id").notNull(),
    botId: uuid("bot_id")
      .notNull()
      .references(() => bots.id, { onDelete: "cascade" }),
    // Clerk user id del miembro habilitado.
    userId: text("user_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uniqBotUser: unique("bot_assignments_bot_user_uq").on(t.botId, t.userId),
    byUser: index("bot_assignments_user_idx").on(t.tenantId, t.userId),
  }),
);

/**
 * Reglas de audiencia por bot: lista blanca (`allow`) y lista negra (`block`)
 * de teléfonos en E.164. La negra siempre aplica; la blanca solo cuando el bot
 * tiene `whitelistEnabled`. Un número tiene a lo sumo una regla (unique por bot).
 */
export const phoneRules = pgTable(
  "phone_rules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: text("tenant_id").notNull(),
    botId: uuid("bot_id")
      .notNull()
      .references(() => bots.id, { onDelete: "cascade" }),
    phoneE164: text("phone_e164").notNull(),
    kind: phoneRuleKind("kind").notNull(),
    note: text("note"),
    createdBy: text("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uniqBotPhone: unique("phone_rules_bot_phone_uq").on(t.botId, t.phoneE164),
    byBot: index("phone_rules_bot_idx").on(t.botId, t.kind),
  }),
);

export type PhoneRuleRow = typeof phoneRules.$inferSelect;

/** Eventos crudos recibidos por webhook (auditoría), scopeados por tenant. */
export const webhookEvents = pgTable(
  "webhook_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: text("tenant_id").notNull(),
    botId: uuid("bot_id")
      .notNull()
      .references(() => bots.id, { onDelete: "cascade" }),
    source: webhookSource("source").notNull(),
    type: text("type").notNull(),
    payload: jsonb("payload").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    byTenant: index("webhook_events_tenant_created_idx").on(t.tenantId, t.createdAt),
  }),
);

/** Mapeo WhatsApp (jid) ↔ Chatwoot (contacto, conversación) por bot. */
export const channelLinks = pgTable(
  "channel_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: text("tenant_id").notNull(),
    botId: uuid("bot_id")
      .notNull()
      .references(() => bots.id, { onDelete: "cascade" }),
    waJid: text("wa_jid").notNull(),
    phoneE164: text("phone_e164").notNull(),
    cwContactId: integer("cw_contact_id").notNull(),
    cwConversationId: integer("cw_conversation_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uniqBotJid: unique("channel_links_bot_jid_uq").on(t.botId, t.waJid),
  }),
);

/** Dedup de mensajes procesados: el unique constraint actúa de lock. */
export const processedMessages = pgTable(
  "processed_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: text("tenant_id").notNull(),
    botId: uuid("bot_id")
      .notNull()
      .references(() => bots.id, { onDelete: "cascade" }),
    source: webhookSource("source").notNull(),
    externalId: text("external_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uniqMsg: unique("processed_messages_uq").on(t.botId, t.source, t.externalId),
  }),
);

/**
 * Documentos de identidad del agente, append-only: cada fila es una versión.
 * La vigente es la de mayor `version` por (bot_id, type).
 */
export const identityDocuments = pgTable(
  "identity_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: text("tenant_id").notNull(),
    botId: uuid("bot_id")
      .notNull()
      .references(() => bots.id, { onDelete: "cascade" }),
    type: identityType("type").notNull(),
    version: integer("version").notNull(),
    content: text("content").notNull(),
    createdBy: text("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uniqVersion: unique("identity_documents_bot_type_version_uq").on(t.botId, t.type, t.version),
    byBot: index("identity_documents_bot_idx").on(t.botId, t.type),
  }),
);

// --- Base de conocimiento (E05 / US-009) -----------------------------------

/**
 * Fuente de conocimiento de un bot: texto pegado, archivo (md/txt/pdf) o FAQ.
 * `rawText` conserva el texto extraído para poder reindexar sin el archivo.
 */
export const knowledgeSources = pgTable(
  "knowledge_sources",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: text("tenant_id").notNull(),
    botId: uuid("bot_id")
      .notNull()
      .references(() => bots.id, { onDelete: "cascade" }),
    kind: knowledgeSourceKind("kind").notNull(),
    title: text("title").notNull(),
    rawText: text("raw_text").notNull(),
    status: knowledgeSourceStatus("status").notNull().default("pending"),
    error: text("error"),
    createdBy: text("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    byBot: index("knowledge_sources_bot_idx").on(t.botId),
  }),
);

/**
 * Chunk indexado de una fuente. El embedding se guarda como jsonb (number[]):
 * el Postgres de Dokploy no trae pgvector; la similitud coseno se calcula
 * in-process en `retrieve()` — suficiente a escala MVP. Deuda: migrar a
 * pgvector + HNSW cuando la imagen de Postgres lo soporte.
 */
export const knowledgeChunks = pgTable(
  "knowledge_chunks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: text("tenant_id").notNull(),
    botId: uuid("bot_id")
      .notNull()
      .references(() => bots.id, { onDelete: "cascade" }),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => knowledgeSources.id, { onDelete: "cascade" }),
    seq: integer("seq").notNull(),
    content: text("content").notNull(),
    embedding: jsonb("embedding").$type<number[]>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    byBot: index("knowledge_chunks_bot_idx").on(t.botId),
    bySource: index("knowledge_chunks_source_idx").on(t.sourceId),
  }),
);

// --- Catálogo (E05 / US-010) ------------------------------------------------

/**
 * Ítem del catálogo. La columna generada `search tsvector` (config spanish,
 * sobre name+description+attributes) vive solo en SQL (migración); las
 * consultas full-text usan sql`` directamente.
 */
export const catalogItems = pgTable(
  "catalog_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: text("tenant_id").notNull(),
    botId: uuid("bot_id")
      .notNull()
      .references(() => bots.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    // numeric → string en TS; nunca float binario (P3 de US-010).
    price: numeric("price", { precision: 12, scale: 2 }).notNull(),
    currency: text("currency").notNull(),
    availability: catalogAvailability("availability").notNull().default("available"),
    attributes: jsonb("attributes").$type<Record<string, string>>().notNull().default({}),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    byBot: index("catalog_items_bot_idx").on(t.botId),
  }),
);

// --- Motor conversacional (E06 / US-011, US-012) -----------------------------

/**
 * Estado propio de cada conversación (no depende de Chatwoot). Una fila por
 * channel_link (MVP: una conversación viva por contacto). `lockedAt` actúa de
 * lock con TTL 60s para serializar generaciones; `consolidatedAt` marca la
 * consolidación de memoria (E07) y se resetea con cada mensaje nuevo.
 */
export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: text("tenant_id").notNull(),
    botId: uuid("bot_id")
      .notNull()
      .references(() => bots.id, { onDelete: "cascade" }),
    channelLinkId: uuid("channel_link_id")
      .notNull()
      .references(() => channelLinks.id, { onDelete: "cascade" }),
    mode: conversationMode("mode").notNull().default("bot"),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    lastMsgAt: timestamp("last_msg_at", { withTimezone: true }).notNull().defaultNow(),
    consolidatedAt: timestamp("consolidated_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uniqLink: unique("conversations_channel_link_uq").on(t.channelLinkId),
    byTenant: index("conversations_tenant_idx").on(t.tenantId),
    byBot: index("conversations_bot_idx").on(t.botId),
  }),
);

/** Traza de cada invocación al LLM (éxito o error) — P4 de US-011. */
export const generations = pgTable(
  "generations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: text("tenant_id").notNull(),
    botId: uuid("bot_id")
      .notNull()
      .references(() => bots.id, { onDelete: "cascade" }),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    model: text("model").notNull(),
    prompt: jsonb("prompt").notNull(),
    response: text("response"),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    latencyMs: integer("latency_ms"),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    byTenant: index("generations_tenant_idx").on(t.tenantId, t.createdAt),
    byConversation: index("generations_conversation_idx").on(t.conversationId),
  }),
);

/** Auditoría de transiciones de modo (US-012, P2). */
export const conversationTransitions = pgTable(
  "conversation_transitions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: text("tenant_id").notNull(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    fromMode: conversationMode("from_mode").notNull(),
    toMode: conversationMode("to_mode").notNull(),
    cause: text("cause").notNull(),
    actorId: text("actor_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    byConversation: index("conversation_transitions_conversation_idx").on(t.conversationId),
  }),
);

// --- Memoria por cliente (E07 / US-013) --------------------------------------

/** Resumen acumulado por contacto (anclado al channel_link → aislamiento por bot/tenant). */
export const contactMemories = pgTable("contact_memories", {
  channelLinkId: uuid("channel_link_id")
    .primaryKey()
    .references(() => channelLinks.id, { onDelete: "cascade" }),
  tenantId: text("tenant_id").notNull(),
  botId: uuid("bot_id")
    .notNull()
    .references(() => bots.id, { onDelete: "cascade" }),
  summary: text("summary").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Hecho clave-valor sobre el contacto. A lo sumo un valor vigente por (contacto, clave). */
export const contactFacts = pgTable(
  "contact_facts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: text("tenant_id").notNull(),
    botId: uuid("bot_id")
      .notNull()
      .references(() => bots.id, { onDelete: "cascade" }),
    channelLinkId: uuid("channel_link_id")
      .notNull()
      .references(() => channelLinks.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    value: text("value").notNull(),
    origin: factOrigin("origin").notNull(),
    updatedBy: text("updated_by"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uniqFact: unique("contact_facts_link_key_uq").on(t.channelLinkId, t.key),
    byLink: index("contact_facts_link_idx").on(t.channelLinkId),
  }),
);

export type KnowledgeSourceRow = typeof knowledgeSources.$inferSelect;
export type KnowledgeChunkRow = typeof knowledgeChunks.$inferSelect;
export type CatalogItemRow = typeof catalogItems.$inferSelect;
export type ConversationRow = typeof conversations.$inferSelect;
export type GenerationRow = typeof generations.$inferSelect;
export type ConversationTransitionRow = typeof conversationTransitions.$inferSelect;
export type ContactMemoryRow = typeof contactMemories.$inferSelect;
export type ContactFactRow = typeof contactFacts.$inferSelect;

export type WebhookEventRow = typeof webhookEvents.$inferSelect;
export type ChannelLinkRow = typeof channelLinks.$inferSelect;
export type IdentityDocumentRow = typeof identityDocuments.$inferSelect;
export type BotRow = typeof bots.$inferSelect;
export type NewBotRow = typeof bots.$inferInsert;
export type BotAssignmentRow = typeof botAssignments.$inferSelect;
export type NewBotAssignmentRow = typeof botAssignments.$inferInsert;
