CREATE TYPE "public"."channel_status" AS ENUM('connected', 'disconnected', 'error');--> statement-breakpoint
CREATE TYPE "public"."channel_type" AS ENUM('telegram', 'whatsapp_cloud', 'instagram', 'messenger');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bot_status_transitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"bot_id" uuid NOT NULL,
	"from_status" "bot_status" NOT NULL,
	"to_status" "bot_status" NOT NULL,
	"cause" text NOT NULL,
	"actor_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "channels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"bot_id" uuid NOT NULL,
	"type" "channel_type" NOT NULL,
	"status" "channel_status" DEFAULT 'connected' NOT NULL,
	"credentials" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"chatwoot_inbox_id" integer,
	"display_name" text,
	"error" text,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "channels_bot_type_uq" UNIQUE("bot_id","type")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "extracted_data" (
	"channel_link_id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"bot_id" uuid NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"manual_keys" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"provenance" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bots" ADD COLUMN "extraction_schema" jsonb;--> statement-breakpoint
ALTER TABLE "channel_links" ADD COLUMN "channel_id" uuid;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "chatwoot_account_webhook_id" integer;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "chatwoot_account_webhook_token" text;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bot_status_transitions" ADD CONSTRAINT "bot_status_transitions_bot_id_bots_id_fk" FOREIGN KEY ("bot_id") REFERENCES "public"."bots"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "channels" ADD CONSTRAINT "channels_bot_id_bots_id_fk" FOREIGN KEY ("bot_id") REFERENCES "public"."bots"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "extracted_data" ADD CONSTRAINT "extracted_data_channel_link_id_channel_links_id_fk" FOREIGN KEY ("channel_link_id") REFERENCES "public"."channel_links"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "extracted_data" ADD CONSTRAINT "extracted_data_bot_id_bots_id_fk" FOREIGN KEY ("bot_id") REFERENCES "public"."bots"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bot_status_transitions_bot_idx" ON "bot_status_transitions" USING btree ("bot_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "channels_bot_idx" ON "channels" USING btree ("bot_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "channels_inbox_idx" ON "channels" USING btree ("chatwoot_inbox_id");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "channel_links" ADD CONSTRAINT "channel_links_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
-- E10 backfill: bots ya conectados que seguían en draft pasan a active para
-- que el nuevo enforcement (solo "active" responde) no los silencie al desplegar.
UPDATE "bots" SET "status" = 'active' WHERE "connection_status" = 'connected' AND "status" = 'draft';
