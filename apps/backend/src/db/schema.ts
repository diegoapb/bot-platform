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
} from "drizzle-orm/pg-core";

export const botChannel = pgEnum("bot_channel", ["whatsapp"]);
export const botStatus = pgEnum("bot_status", ["draft", "active", "paused"]);

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
    chatwootInboxId: integer("chatwoot_inbox_id"),
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

export type BotRow = typeof bots.$inferSelect;
export type NewBotRow = typeof bots.$inferInsert;
export type BotAssignmentRow = typeof botAssignments.$inferSelect;
export type NewBotAssignmentRow = typeof botAssignments.$inferInsert;
