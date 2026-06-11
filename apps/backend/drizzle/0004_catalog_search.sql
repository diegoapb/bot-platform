ALTER TABLE "catalog_items" ADD COLUMN "search" tsvector GENERATED ALWAYS AS (
  to_tsvector('spanish', coalesce("name",'') || ' ' || coalesce("description",'') || ' ' || coalesce("attributes"::text,''))
) STORED;
--> statement-breakpoint
CREATE INDEX "catalog_items_search_idx" ON "catalog_items" USING gin ("search");
