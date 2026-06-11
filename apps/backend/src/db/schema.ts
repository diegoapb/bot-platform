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

export type WebhookEventRow = typeof webhookEvents.$inferSelect;
export type ChannelLinkRow = typeof channelLinks.$inferSelect;
export type IdentityDocumentRow = typeof identityDocuments.$inferSelect;
export type BotRow = typeof bots.$inferSelect;
export type NewBotRow = typeof bots.$inferInsert;
export type BotAssignmentRow = typeof botAssignments.$inferSelect;
export type NewBotAssignmentRow = typeof botAssignments.$inferInsert;
