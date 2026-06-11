CREATE TYPE "public"."phone_rule_kind" AS ENUM('allow', 'block');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "phone_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"bot_id" uuid NOT NULL,
	"phone_e164" text NOT NULL,
	"kind" "phone_rule_kind" NOT NULL,
	"note" text,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "phone_rules_bot_phone_uq" UNIQUE("bot_id","phone_e164")
);
--> statement-breakpoint
ALTER TABLE "bots" ADD COLUMN "whitelist_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "phone_rules" ADD CONSTRAINT "phone_rules_bot_id_bots_id_fk" FOREIGN KEY ("bot_id") REFERENCES "public"."bots"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "phone_rules_bot_idx" ON "phone_rules" USING btree ("bot_id","kind");