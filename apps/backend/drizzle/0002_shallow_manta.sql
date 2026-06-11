CREATE TYPE "public"."connection_status" AS ENUM('disconnected', 'qr', 'connected');--> statement-breakpoint
CREATE TYPE "public"."identity_type" AS ENUM('SOUL', 'IDENTITY', 'GUARDRAILS');--> statement-breakpoint
CREATE TYPE "public"."webhook_source" AS ENUM('evolution', 'chatwoot');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "channel_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"bot_id" uuid NOT NULL,
	"wa_jid" text NOT NULL,
	"phone_e164" text NOT NULL,
	"cw_contact_id" integer NOT NULL,
	"cw_conversation_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "channel_links_bot_jid_uq" UNIQUE("bot_id","wa_jid")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "identity_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"bot_id" uuid NOT NULL,
	"type" "identity_type" NOT NULL,
	"version" integer NOT NULL,
	"content" text NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "identity_documents_bot_type_version_uq" UNIQUE("bot_id","type","version")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "processed_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"bot_id" uuid NOT NULL,
	"source" "webhook_source" NOT NULL,
	"external_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "processed_messages_uq" UNIQUE("bot_id","source","external_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"bot_id" uuid NOT NULL,
	"source" "webhook_source" NOT NULL,
	"type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bots" ADD COLUMN "connection_status" "connection_status" DEFAULT 'disconnected' NOT NULL;--> statement-breakpoint
ALTER TABLE "bots" ADD COLUMN "last_connected_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "bots" ADD COLUMN "chatwoot_inbox_identifier" text;--> statement-breakpoint
ALTER TABLE "bots" ADD COLUMN "chatwoot_webhook_token" text;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "chatwoot_account_id" integer;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "channel_links" ADD CONSTRAINT "channel_links_bot_id_bots_id_fk" FOREIGN KEY ("bot_id") REFERENCES "public"."bots"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "identity_documents" ADD CONSTRAINT "identity_documents_bot_id_bots_id_fk" FOREIGN KEY ("bot_id") REFERENCES "public"."bots"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "processed_messages" ADD CONSTRAINT "processed_messages_bot_id_bots_id_fk" FOREIGN KEY ("bot_id") REFERENCES "public"."bots"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "webhook_events" ADD CONSTRAINT "webhook_events_bot_id_bots_id_fk" FOREIGN KEY ("bot_id") REFERENCES "public"."bots"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "identity_documents_bot_idx" ON "identity_documents" USING btree ("bot_id","type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "webhook_events_tenant_created_idx" ON "webhook_events" USING btree ("tenant_id","created_at");