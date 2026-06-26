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
  vector,
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
export const channelType = pgEnum("channel_type", [
  "telegram",
  "whatsapp_cloud",
  "instagram",
  "messenger",
  // E13/US-031: el transporte WhatsApp vía Evolution se normaliza como canal
  // real para uniformar el ruteo (webhook → channels → agent_channels → agente).
  "whatsapp_evolution",
]);
export const channelStatus = pgEnum("channel_status", [
  "connected",
  "disconnected",
  "error",
]);
// E13/US-030: estado del agente (el "cerebro"), independiente del bot legacy.
export const agentStatus = pgEnum("agent_status", ["draft", "active", "paused"]);

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
  // Webhook a nivel de cuenta de Chatwoot (E11): recibe message_created /
  // conversation_updated de TODOS los inboxes del tenant. Un solo webhook por
  // cuenta; los eventos se rutean por inbox_id a su canal.
  chatwootAccountWebhookId: integer("chatwoot_account_webhook_id"),
  chatwootAccountWebhookToken: text("chatwoot_account_webhook_token"),
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
    // E12: JSON Schema (subset) que define qué información estructurada extraer
    // de las conversaciones. null = extracción desactivada para este bot.
    extractionSchema: jsonb("extraction_schema").$type<Record<string, unknown> | null>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    byTenant: index("bots_tenant_idx").on(t.tenantId),
  }),
);

/**
 * Agente (E13/US-030): el "cerebro" desacoplado del transporte. Captura la
 * configuración que antes vivía fusionada en `bots` (identidad, modelo,
 * extracción, audiencia, handoff). El transporte (Evolution/Chatwoot) sigue en
 * `bots` durante la transición; `legacyBotId` materializa el mapeo 1:1 bot→agente
 * de la migración. `model` NULL = usa el modelo global (`env.LLM_MODEL`).
 */
export const agents = pgTable(
  "agents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: text("tenant_id").notNull(),
    createdBy: text("created_by").notNull(),
    name: text("name").notNull(),
    status: agentStatus("status").notNull().default("draft"),
    // NULL => usa env.LLM_MODEL (modelo global de la plataforma).
    model: text("model"),
    extractionSchema: jsonb("extraction_schema").$type<Record<string, unknown> | null>(),
    whitelistEnabled: boolean("whitelist_enabled").notNull().default(false),
    handoffMessage: text("handoff_message")
      .notNull()
      .default("Te comunico con una persona del equipo, en breve te atienden."),
    // Puente 1:1 con el bot legacy (transporte). NULL para agentes creados
    // directamente en la UI (US-034). Unique → a lo sumo un agente por bot.
    legacyBotId: uuid("legacy_bot_id").references(() => bots.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    byTenant: index("agents_tenant_idx").on(t.tenantId),
    uniqLegacyBot: unique("agents_legacy_bot_uq").on(t.legacyBotId),
  }),
);

/**
 * Enlace N:M agente ↔ canal (E13/US-031). En fase 1 el `unique(channel_id)`
 * impone el invariante un-canal-un-agente; se relaja en E14. El ruteo de inbound
 * resuelve el agente a partir del canal por el que llega el mensaje.
 */
export const agentChannels = pgTable(
  "agent_channels",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: text("tenant_id").notNull(),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    channelId: uuid("channel_id")
      .notNull()
      .references(() => channels.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    // Invariante fase 1: un canal pertenece a lo sumo a un agente.
    uniqChannel: unique("agent_channels_channel_uq").on(t.channelId),
    byAgent: index("agent_channels_agent_idx").on(t.agentId),
    byTenant: index("agent_channels_tenant_idx").on(t.tenantId),
  }),
);

/**
 * Auditoría de activación/desactivación global del bot (E10/US-019): quién
 * cambió `bots.status`, cuándo y por qué causa ("panel:user" | "system:connected").
 */
export const botStatusTransitions = pgTable(
  "bot_status_transitions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: text("tenant_id").notNull(),
    botId: uuid("bot_id")
      .notNull()
      .references(() => bots.id, { onDelete: "cascade" }),
    fromStatus: botStatus("from_status").notNull(),
    toStatus: botStatus("to_status").notNull(),
    cause: text("cause").notNull(),
    actorId: text("actor_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    byBot: index("bot_status_transitions_bot_idx").on(t.botId, t.createdAt),
  }),
);

/**
 * Canal de comunicación de un bot (E11/US-021): cada canal es un inbox propio
 * en Chatwoot y el motor responde de forma agnóstica al transporte. El canal
 * WhatsApp vía Evolution (E02) sigue viviendo en columnas de `bots` y se
 * presenta como canal virtual en la API; aquí van solo los canales nativos de
 * Chatwoot (Telegram, WhatsApp Cloud, Instagram, Messenger).
 */
export const channels = pgTable(
  "channels",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: text("tenant_id").notNull(),
    botId: uuid("bot_id")
      .notNull()
      .references(() => bots.id, { onDelete: "cascade" }),
    type: channelType("type").notNull(),
    status: channelStatus("status").notNull().default("connected"),
    // Credenciales del conector (bot token, tokens de Meta…). Secretas: nunca
    // se devuelven al frontend.
    credentials: jsonb("credentials").$type<Record<string, string>>().notNull().default({}),
    // Inbox de Chatwoot que materializa este canal.
    chatwootInboxId: integer("chatwoot_inbox_id"),
    // Etiqueta visible (p.ej. @username del bot de Telegram, nombre de la página).
    displayName: text("display_name"),
    error: text("error"),
    createdBy: text("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uniqBotType: unique("channels_bot_type_uq").on(t.botId, t.type),
    byBot: index("channels_bot_idx").on(t.botId),
    byInbox: index("channels_inbox_idx").on(t.chatwootInboxId),
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

/**
 * Mapeo contacto del canal ↔ Chatwoot (contacto, conversación) por bot.
 * Para WhatsApp/Evolution `waJid` es el jid; para canales nativos de Chatwoot
 * (E11) es un id sintético `cw:<conversationId>` y `channelId` indica el canal.
 * `channelId` null = canal WhatsApp vía Evolution (legado E02/E03).
 */
export const channelLinks = pgTable(
  "channel_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: text("tenant_id").notNull(),
    botId: uuid("bot_id")
      .notNull()
      .references(() => bots.id, { onDelete: "cascade" }),
    channelId: uuid("channel_id").references(() => channels.id, { onDelete: "set null" }),
    // E13/US-033: contacto unificado del agente al que pertenece este link.
    // NULL durante la transición / si aún no se resolvió.
    contactId: uuid("contact_id").references(() => contacts.id, { onDelete: "set null" }),
    waJid: text("wa_jid").notNull(),
    phoneE164: text("phone_e164").notNull(),
    cwContactId: integer("cw_contact_id").notNull(),
    cwConversationId: integer("cw_conversation_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uniqBotJid: unique("channel_links_bot_jid_uq").on(t.botId, t.waJid),
    byContact: index("channel_links_contact_idx").on(t.contactId),
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
 * La vigente es la de mayor `version` por (agent_id, type) — E13/US-030 reapuntó
 * el ancla de `bot_id` a `agent_id`. `bot_id` se conserva (nullable) durante la
 * transición para rollback.
 */
export const identityDocuments = pgTable(
  "identity_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: text("tenant_id").notNull(),
    // Conservado para rollback; ya no es el ancla. Sin FK para desacoplar el
    // ciclo de vida de la identidad del bot legacy.
    botId: uuid("bot_id"),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    type: identityType("type").notNull(),
    version: integer("version").notNull(),
    content: text("content").notNull(),
    createdBy: text("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uniqVersion: unique("identity_documents_agent_type_version_uq").on(
      t.agentId,
      t.type,
      t.version,
    ),
    byAgent: index("identity_documents_agent_idx").on(t.agentId, t.type),
  }),
);

// --- Base de conocimiento (E05 / US-009) -----------------------------------

/**
 * Colección de conocimiento reutilizable (E13/US-032): unidad propia del tenant
 * que agrupa fuentes y chunks y se enlaza a uno o varios agentes (referencia
 * viva). El conocimiento deja de colgar del bot.
 */
export const knowledgeCollections = pgTable(
  "knowledge_collections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: text("tenant_id").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    createdBy: text("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    byTenant: index("knowledge_collections_tenant_idx").on(t.tenantId),
  }),
);

/**
 * Enlace N:M agente ↔ colección (E13/US-032). Referencia viva: editar la
 * colección impacta a todos los agentes que la enlazan, sin copia por agente.
 */
export const agentKnowledgeCollections = pgTable(
  "agent_knowledge_collections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: text("tenant_id").notNull(),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    collectionId: uuid("collection_id")
      .notNull()
      .references(() => knowledgeCollections.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uniqLink: unique("agent_knowledge_collections_uq").on(t.agentId, t.collectionId),
    byAgent: index("agent_knowledge_collections_agent_idx").on(t.agentId),
    byCollection: index("agent_knowledge_collections_collection_idx").on(t.collectionId),
  }),
);

/**
 * Fuente de conocimiento de una colección: texto pegado, archivo (md/txt/pdf) o
 * FAQ. `rawText` conserva el texto extraído para poder reindexar sin el archivo.
 * E13/US-032 reapuntó el ancla de `bot_id` a `collection_id`.
 */
export const knowledgeSources = pgTable(
  "knowledge_sources",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: text("tenant_id").notNull(),
    // Conservado para rollback; ya no es el ancla ni FK obligatoria.
    botId: uuid("bot_id"),
    collectionId: uuid("collection_id")
      .notNull()
      .references(() => knowledgeCollections.id, { onDelete: "cascade" }),
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
    byCollection: index("knowledge_sources_collection_idx").on(t.collectionId),
  }),
);

/**
 * Chunk indexado de una fuente. El embedding se guarda como `vector(1536)`
 * (pgvector, dimensión de `text-embedding-3-small`). La búsqueda semántica se
 * delega a Postgres vía el operador de distancia coseno con índice HNSW
 * (`retrieve()` en knowledge.ts). Requiere `CREATE EXTENSION vector` en la DB.
 */
export const knowledgeChunks = pgTable(
  "knowledge_chunks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: text("tenant_id").notNull(),
    // Conservado para rollback; ya no es el ancla ni FK obligatoria.
    botId: uuid("bot_id"),
    collectionId: uuid("collection_id")
      .notNull()
      .references(() => knowledgeCollections.id, { onDelete: "cascade" }),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => knowledgeSources.id, { onDelete: "cascade" }),
    seq: integer("seq").notNull(),
    content: text("content").notNull(),
    embedding: vector("embedding", { dimensions: 1536 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    byCollection: index("knowledge_chunks_collection_idx").on(t.collectionId),
    bySource: index("knowledge_chunks_source_idx").on(t.sourceId),
    // HNSW para la búsqueda por distancia coseno (`<=>`).
    byEmbedding: index("knowledge_chunks_embedding_hnsw").using(
      "hnsw",
      t.embedding.op("vector_cosine_ops"),
    ),
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
    // Transporte legacy (Evolution/Chatwoot): por dónde se entrega la respuesta.
    botId: uuid("bot_id")
      .notNull()
      .references(() => bots.id, { onDelete: "cascade" }),
    // E13/US-031: el "cerebro" fijado al crear la conversación. No cambia en
    // caliente (decisión D3): aunque el canal se reasigne, esta conversación
    // sigue con su agente.
    agentId: uuid("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
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
    byAgent: index("conversations_agent_idx").on(t.agentId),
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

/**
 * Contacto unificado del agente (E13/US-033): persona del lado del cliente,
 * identificada por teléfono E.164 o email normalizado, propia de un agente.
 * Agrupa los `channel_links` que comparten identificador → memoria compartida
 * entre canales. Aislamiento estricto por (tenant, agente): nunca se unifica
 * cross-agent ni cross-tenant (unique).
 */
export const contacts = pgTable(
  "contacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: text("tenant_id").notNull(),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    // E.164, email normalizado, o id sintético del link si no hay identificador fiable.
    primaryIdentifier: text("primary_identifier").notNull(),
    displayName: text("display_name"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uniqIdentifier: unique("contacts_agent_identifier_uq").on(
      t.tenantId,
      t.agentId,
      t.primaryIdentifier,
    ),
    byAgent: index("contacts_agent_idx").on(t.agentId),
  }),
);

/**
 * Resumen acumulado por contacto. E13/US-033 reapuntó el ancla de
 * `channel_link_id` a `contact_id` (compartido entre canales del contacto).
 * `channel_link_id` se conserva (PK legacy) durante la transición.
 */
export const contactMemories = pgTable(
  "contact_memories",
  {
    channelLinkId: uuid("channel_link_id")
      .primaryKey()
      .references(() => channelLinks.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "cascade" }),
    tenantId: text("tenant_id").notNull(),
    botId: uuid("bot_id")
      .notNull()
      .references(() => bots.id, { onDelete: "cascade" }),
    summary: text("summary").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    // Un resumen vigente por contacto → lectura/escritura por contact_id.
    uniqContact: unique("contact_memories_contact_uq").on(t.contactId),
  }),
);

/** Hecho clave-valor sobre el contacto. A lo sumo un valor vigente por (contacto, clave). */
export const contactFacts = pgTable(
  "contact_facts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: text("tenant_id").notNull(),
    botId: uuid("bot_id")
      .notNull()
      .references(() => bots.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "cascade" }),
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
    // E13/US-033: un valor vigente por (contacto, clave).
    uniqFact: unique("contact_facts_contact_key_uq").on(t.contactId, t.key),
    byContact: index("contact_facts_contact_idx").on(t.contactId),
  }),
);

// --- Extracción de información estructurada (E12 / US-027..029) ---------------

/**
 * JSON estructurado extraído de las conversaciones de un contacto, según el
 * `extractionSchema` del bot. Una fila por channel_link.
 *  - `data`: valores vigentes (objeto plano validado contra el esquema).
 *  - `manualKeys`: claves corregidas a mano; la extracción automática no las pisa.
 *  - `provenance`: por clave, de dónde salió el valor y cuándo.
 */
export const extractedData = pgTable(
  "extracted_data",
  {
    channelLinkId: uuid("channel_link_id")
      .primaryKey()
      .references(() => channelLinks.id, { onDelete: "cascade" }),
    // E13/US-033: ancla unificada por contacto (compartida entre canales).
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "cascade" }),
    tenantId: text("tenant_id").notNull(),
    botId: uuid("bot_id")
      .notNull()
      .references(() => bots.id, { onDelete: "cascade" }),
    data: jsonb("data").$type<Record<string, unknown>>().notNull().default({}),
    manualKeys: jsonb("manual_keys").$type<string[]>().notNull().default([]),
    provenance: jsonb("provenance")
      .$type<Record<string, { source: "bot" | "human"; at: string }>>()
      .notNull()
      .default({}),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uniqContact: unique("extracted_data_contact_uq").on(t.contactId),
  }),
);

export type ExtractedDataRow = typeof extractedData.$inferSelect;
export type ChannelRow = typeof channels.$inferSelect;
export type BotStatusTransitionRow = typeof botStatusTransitions.$inferSelect;

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

// --- E13: desacople agente / canal / conocimiento ---------------------------
export type AgentRow = typeof agents.$inferSelect;
export type NewAgentRow = typeof agents.$inferInsert;
export type AgentChannelRow = typeof agentChannels.$inferSelect;
export type KnowledgeCollectionRow = typeof knowledgeCollections.$inferSelect;
export type AgentKnowledgeCollectionRow = typeof agentKnowledgeCollections.$inferSelect;
export type ContactRow = typeof contacts.$inferSelect;
