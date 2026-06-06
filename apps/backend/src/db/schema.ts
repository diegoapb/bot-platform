import { pgTable, uuid, text, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";

export const botChannel = pgEnum("bot_channel", ["whatsapp"]);
export const botStatus = pgEnum("bot_status", ["draft", "active", "paused"]);

/**
 * Un "bot" = una configuración que conecta una instancia de Evolution API
 * (WhatsApp) con, opcionalmente, un inbox de Chatwoot para escalado humano.
 */
export const bots = pgTable("bots", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Dueño del bot (Clerk user id). Multi-tenant por usuario/organización.
  ownerId: text("owner_id").notNull(),
  name: text("name").notNull(),
  channel: botChannel("channel").notNull().default("whatsapp"),
  status: botStatus("status").notNull().default("draft"),
  evolutionInstance: text("evolution_instance"),
  chatwootInboxId: integer("chatwoot_inbox_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type BotRow = typeof bots.$inferSelect;
export type NewBotRow = typeof bots.$inferInsert;
