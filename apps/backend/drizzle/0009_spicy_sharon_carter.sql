-- E13 · Desacople agente / canal / conocimiento + contacto unificado.
-- DDL (nuevas tablas/columnas como NULLABLE) → backfill idempotente → SET NOT NULL
-- → constraints. El valor de enum 'whatsapp_evolution' se añadió en 0008 (otra
-- transacción), por lo que aquí ya es usable en el backfill.

CREATE TYPE "public"."agent_status" AS ENUM('draft', 'active', 'paused');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agent_channels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"agent_id" uuid NOT NULL,
	"channel_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "agent_channels_channel_uq" UNIQUE("channel_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agent_knowledge_collections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"agent_id" uuid NOT NULL,
	"collection_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "agent_knowledge_collections_uq" UNIQUE("agent_id","collection_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"created_by" text NOT NULL,
	"name" text NOT NULL,
	"status" "agent_status" DEFAULT 'draft' NOT NULL,
	"model" text,
	"extraction_schema" jsonb,
	"whitelist_enabled" boolean DEFAULT false NOT NULL,
	"handoff_message" text DEFAULT 'Te comunico con una persona del equipo, en breve te atienden.' NOT NULL,
	"legacy_bot_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "agents_legacy_bot_uq" UNIQUE("legacy_bot_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"agent_id" uuid NOT NULL,
	"primary_identifier" text NOT NULL,
	"display_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contacts_agent_identifier_uq" UNIQUE("tenant_id","agent_id","primary_identifier")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "knowledge_collections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "contact_facts" DROP CONSTRAINT "contact_facts_link_key_uq";--> statement-breakpoint
ALTER TABLE "identity_documents" DROP CONSTRAINT "identity_documents_bot_type_version_uq";--> statement-breakpoint
ALTER TABLE "identity_documents" DROP CONSTRAINT "identity_documents_bot_id_bots_id_fk";
--> statement-breakpoint
ALTER TABLE "knowledge_chunks" DROP CONSTRAINT "knowledge_chunks_bot_id_bots_id_fk";
--> statement-breakpoint
ALTER TABLE "knowledge_sources" DROP CONSTRAINT "knowledge_sources_bot_id_bots_id_fk";
--> statement-breakpoint
DROP INDEX IF EXISTS "contact_facts_link_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "identity_documents_bot_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "knowledge_chunks_bot_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "knowledge_sources_bot_idx";--> statement-breakpoint
ALTER TABLE "identity_documents" ALTER COLUMN "bot_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "knowledge_chunks" ALTER COLUMN "bot_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "knowledge_sources" ALTER COLUMN "bot_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "channel_links" ADD COLUMN "contact_id" uuid;--> statement-breakpoint
ALTER TABLE "contact_facts" ADD COLUMN "contact_id" uuid;--> statement-breakpoint
ALTER TABLE "contact_memories" ADD COLUMN "contact_id" uuid;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "agent_id" uuid;--> statement-breakpoint
ALTER TABLE "extracted_data" ADD COLUMN "contact_id" uuid;--> statement-breakpoint
ALTER TABLE "identity_documents" ADD COLUMN "agent_id" uuid;--> statement-breakpoint
ALTER TABLE "knowledge_chunks" ADD COLUMN "collection_id" uuid;--> statement-breakpoint
ALTER TABLE "knowledge_sources" ADD COLUMN "collection_id" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "agent_channels" ADD CONSTRAINT "agent_channels_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "agent_channels" ADD CONSTRAINT "agent_channels_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "agent_knowledge_collections" ADD CONSTRAINT "agent_knowledge_collections_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "agent_knowledge_collections" ADD CONSTRAINT "agent_knowledge_collections_collection_id_knowledge_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."knowledge_collections"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "agents" ADD CONSTRAINT "agents_legacy_bot_id_bots_id_fk" FOREIGN KEY ("legacy_bot_id") REFERENCES "public"."bots"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contacts" ADD CONSTRAINT "contacts_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agent_channels_agent_idx" ON "agent_channels" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agent_channels_tenant_idx" ON "agent_channels" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agent_knowledge_collections_agent_idx" ON "agent_knowledge_collections" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agent_knowledge_collections_collection_idx" ON "agent_knowledge_collections" USING btree ("collection_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agents_tenant_idx" ON "agents" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "contacts_agent_idx" ON "contacts" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "knowledge_collections_tenant_idx" ON "knowledge_collections" USING btree ("tenant_id");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "channel_links" ADD CONSTRAINT "channel_links_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contact_facts" ADD CONSTRAINT "contact_facts_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contact_memories" ADD CONSTRAINT "contact_memories_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "conversations" ADD CONSTRAINT "conversations_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "extracted_data" ADD CONSTRAINT "extracted_data_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "identity_documents" ADD CONSTRAINT "identity_documents_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "knowledge_chunks_collection_id_knowledge_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."knowledge_collections"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "knowledge_sources" ADD CONSTRAINT "knowledge_sources_collection_id_knowledge_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."knowledge_collections"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "channel_links_contact_idx" ON "channel_links" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "contact_facts_contact_idx" ON "contact_facts" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conversations_agent_idx" ON "conversations" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "identity_documents_agent_idx" ON "identity_documents" USING btree ("agent_id","type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "knowledge_chunks_collection_idx" ON "knowledge_chunks" USING btree ("collection_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "knowledge_sources_collection_idx" ON "knowledge_sources" USING btree ("collection_id");--> statement-breakpoint

-- ===========================================================================
-- BACKFILL idempotente (E13). Re-ejecutable: cada paso filtra lo ya migrado.
-- ===========================================================================

-- A) US-030: 1 agente por bot (model NULL = global), copiando la config "cerebro".
INSERT INTO "agents" ("tenant_id", "created_by", "name", "status", "model", "extraction_schema", "whitelist_enabled", "handoff_message", "legacy_bot_id")
SELECT b."tenant_id", b."created_by", b."name", b."status"::text::"agent_status", NULL, b."extraction_schema", b."whitelist_enabled", b."handoff_message", b."id"
FROM "bots" b
WHERE NOT EXISTS (SELECT 1 FROM "agents" a WHERE a."legacy_bot_id" = b."id");--> statement-breakpoint

-- B) US-030: reapuntar identidad al agente preservando todas las versiones.
UPDATE "identity_documents" d
SET "agent_id" = a."id"
FROM "agents" a
WHERE a."legacy_bot_id" = d."bot_id" AND d."agent_id" IS NULL;--> statement-breakpoint

-- C) US-031: normalizar el transporte WhatsApp/Evolution como canal real.
INSERT INTO "channels" ("tenant_id", "bot_id", "type", "status", "credentials", "chatwoot_inbox_id", "display_name", "created_by", "created_at", "updated_at")
SELECT b."tenant_id", b."id", 'whatsapp_evolution',
  (CASE WHEN b."connection_status" = 'connected' THEN 'connected' ELSE 'disconnected' END)::"channel_status",
  (CASE WHEN b."evolution_instance" IS NOT NULL THEN jsonb_build_object('evolutionInstance', b."evolution_instance") ELSE '{}'::jsonb END),
  b."chatwoot_inbox_id", b."evolution_instance", b."created_by", now(), now()
FROM "bots" b
ON CONFLICT ("bot_id","type") DO NOTHING;--> statement-breakpoint

-- D) US-031: enlazar cada canal (nativo + legacy) al agente de su bot.
INSERT INTO "agent_channels" ("tenant_id", "agent_id", "channel_id")
SELECT c."tenant_id", a."id", c."id"
FROM "channels" c
JOIN "agents" a ON a."legacy_bot_id" = c."bot_id"
WHERE NOT EXISTS (SELECT 1 FROM "agent_channels" ac WHERE ac."channel_id" = c."id");--> statement-breakpoint

-- E1) US-033: 1 contacto por channel_link (sin fusión histórica por defecto).
--      primary_identifier sintético 'link:<id>' garantiza unicidad y evita
--      fusiones accidentales por colisión de teléfono (riesgo Q4 del research).
INSERT INTO "contacts" ("tenant_id", "agent_id", "primary_identifier", "display_name")
SELECT cl."tenant_id", a."id", 'link:' || cl."id"::text, NULL
FROM "channel_links" cl
JOIN "agents" a ON a."legacy_bot_id" = cl."bot_id"
WHERE cl."contact_id" IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM "contacts" c
    WHERE c."tenant_id" = cl."tenant_id" AND c."agent_id" = a."id"
      AND c."primary_identifier" = 'link:' || cl."id"::text
  );--> statement-breakpoint

-- E2) US-033: asociar cada channel_link a su contacto.
UPDATE "channel_links" cl
SET "contact_id" = c."id"
FROM "contacts" c
JOIN "agents" a ON a."id" = c."agent_id"
WHERE a."legacy_bot_id" = cl."bot_id"
  AND c."primary_identifier" = 'link:' || cl."id"::text
  AND cl."contact_id" IS NULL;--> statement-breakpoint

-- F) US-033: reanclar memoria / facts / datos extraídos al contacto.
UPDATE "contact_memories" m SET "contact_id" = cl."contact_id"
FROM "channel_links" cl WHERE cl."id" = m."channel_link_id" AND m."contact_id" IS NULL;--> statement-breakpoint
UPDATE "contact_facts" f SET "contact_id" = cl."contact_id"
FROM "channel_links" cl WHERE cl."id" = f."channel_link_id" AND f."contact_id" IS NULL;--> statement-breakpoint
UPDATE "extracted_data" e SET "contact_id" = cl."contact_id"
FROM "channel_links" cl WHERE cl."id" = e."channel_link_id" AND e."contact_id" IS NULL;--> statement-breakpoint

-- G) US-031: fijar el agente en las conversaciones existentes.
UPDATE "conversations" cv SET "agent_id" = a."id"
FROM "agents" a WHERE a."legacy_bot_id" = cv."bot_id" AND cv."agent_id" IS NULL;--> statement-breakpoint

-- H1) US-032: una colección por bot con conocimiento (marcada para idempotencia).
INSERT INTO "knowledge_collections" ("tenant_id", "name", "description", "created_by")
SELECT b."tenant_id", b."name" || ' — conocimiento', 'legacy:bot:' || b."id"::text, b."created_by"
FROM "bots" b
WHERE EXISTS (SELECT 1 FROM "knowledge_sources" s WHERE s."bot_id" = b."id")
  AND NOT EXISTS (
    SELECT 1 FROM "knowledge_collections" kc
    WHERE kc."tenant_id" = b."tenant_id" AND kc."description" = 'legacy:bot:' || b."id"::text
  );--> statement-breakpoint

-- H2) US-032: mover fuentes y chunks a su colección.
UPDATE "knowledge_sources" s
SET "collection_id" = kc."id"
FROM "knowledge_collections" kc
WHERE kc."tenant_id" = s."tenant_id"
  AND kc."description" = 'legacy:bot:' || s."bot_id"::text
  AND s."collection_id" IS NULL;--> statement-breakpoint
UPDATE "knowledge_chunks" ch
SET "collection_id" = kc."id"
FROM "knowledge_collections" kc
WHERE kc."tenant_id" = ch."tenant_id"
  AND kc."description" = 'legacy:bot:' || ch."bot_id"::text
  AND ch."collection_id" IS NULL;--> statement-breakpoint

-- H3) US-032: enlazar la colección al agente del bot.
INSERT INTO "agent_knowledge_collections" ("tenant_id", "agent_id", "collection_id")
SELECT a."tenant_id", a."id", kc."id"
FROM "knowledge_collections" kc
JOIN "bots" b ON kc."tenant_id" = b."tenant_id" AND kc."description" = 'legacy:bot:' || b."id"::text
JOIN "agents" a ON a."legacy_bot_id" = b."id"
WHERE NOT EXISTS (
  SELECT 1 FROM "agent_knowledge_collections" akc
  WHERE akc."agent_id" = a."id" AND akc."collection_id" = kc."id"
);--> statement-breakpoint

-- ===========================================================================
-- Tras el backfill: enforce NOT NULL + uniques que dependen de los datos.
-- ===========================================================================
ALTER TABLE "identity_documents" ALTER COLUMN "agent_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "conversations" ALTER COLUMN "agent_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "knowledge_sources" ALTER COLUMN "collection_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "knowledge_chunks" ALTER COLUMN "collection_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "contact_memories" ALTER COLUMN "contact_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "contact_facts" ALTER COLUMN "contact_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "extracted_data" ALTER COLUMN "contact_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "contact_facts" ADD CONSTRAINT "contact_facts_contact_key_uq" UNIQUE("contact_id","key");--> statement-breakpoint
ALTER TABLE "contact_memories" ADD CONSTRAINT "contact_memories_contact_uq" UNIQUE("contact_id");--> statement-breakpoint
ALTER TABLE "extracted_data" ADD CONSTRAINT "extracted_data_contact_uq" UNIQUE("contact_id");--> statement-breakpoint
ALTER TABLE "identity_documents" ADD CONSTRAINT "identity_documents_agent_type_version_uq" UNIQUE("agent_id","type","version");
