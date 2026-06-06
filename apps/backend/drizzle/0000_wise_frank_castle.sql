CREATE TYPE "public"."bot_channel" AS ENUM('whatsapp');--> statement-breakpoint
CREATE TYPE "public"."bot_status" AS ENUM('draft', 'active', 'paused');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bot_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"bot_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bot_assignments_bot_user_uq" UNIQUE("bot_id","user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"created_by" text NOT NULL,
	"name" text NOT NULL,
	"channel" "bot_channel" DEFAULT 'whatsapp' NOT NULL,
	"status" "bot_status" DEFAULT 'draft' NOT NULL,
	"evolution_instance" text,
	"chatwoot_inbox_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bot_assignments" ADD CONSTRAINT "bot_assignments_bot_id_bots_id_fk" FOREIGN KEY ("bot_id") REFERENCES "public"."bots"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bot_assignments_user_idx" ON "bot_assignments" USING btree ("tenant_id","user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bots_tenant_idx" ON "bots" USING btree ("tenant_id");