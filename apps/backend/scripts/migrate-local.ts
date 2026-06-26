/**
 * Migrador para la DB de DESARROLLO local (docker-compose.dev.yml).
 *
 * ¿Por qué no `drizzle-kit migrate`? Drizzle aplica TODAS las migraciones
 * pendientes en una ÚNICA transacción. En una DB nueva eso incluye 0008
 * (`ALTER TYPE channel_type ADD VALUE 'whatsapp_evolution'`) y 0009 (que USA ese
 * valor en un backfill). Postgres prohíbe usar un valor de enum recién agregado
 * en la misma transacción (error 55P04), así que el bootstrap desde cero falla.
 * La DB remota nunca lo vio porque se aplicó incrementalmente (commits entre
 * 0008 y 0009).
 *
 * Este script aplica cada archivo de migración en SU PROPIA transacción
 * (commit entre archivos, como se construyó la DB remota), por lo que el valor
 * de enum ya está commiteado cuando 0009 lo usa. Mantiene el MISMO registro que
 * drizzle (`drizzle.__drizzle_migrations`, hash sha256 del archivo + created_at
 * = timestamp del _journal), de modo que la DB queda indistinguible de una
 * migrada con drizzle-kit y un `drizzle-kit migrate` posterior sería no-op.
 *
 *   pnpm --filter @bot/backend db:migrate-local     # (con DATABASE_URL)
 *   make migrate                                     # (recomendado, en docker)
 */
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import postgres from "postgres";

// Mismo fallback de DATABASE_URL que el seed (uso en host). En docker lo fija el compose.
if (!process.env.DATABASE_URL) {
  try {
    const text = readFileSync(new URL("../.env", import.meta.url), "utf8");
    for (const line of text.split("\n")) {
      const m = line.match(/^\s*DATABASE_URL\s*=\s*(.*)\s*$/);
      if (m) {
        process.env.DATABASE_URL = (m[1] ?? "").replace(/^["']|["']$/g, "").trim();
        break;
      }
    }
  } catch {
    // sin .env: el chequeo de abajo dará el error claro.
  }
}

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ Falta DATABASE_URL en el entorno (o en apps/backend/.env).");
  process.exit(1);
}

type JournalEntry = { tag: string; when: number };
const journal = JSON.parse(
  readFileSync(new URL("../drizzle/meta/_journal.json", import.meta.url), "utf8"),
) as { entries: JournalEntry[] };

const sql = postgres(DATABASE_URL, { max: 1 });

async function main() {
  // Tabla de control de drizzle (mismo nombre/forma → compatible con drizzle-kit).
  await sql.unsafe(`CREATE SCHEMA IF NOT EXISTS "drizzle"`);
  await sql.unsafe(
    `CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations" (
       id SERIAL PRIMARY KEY,
       hash text NOT NULL,
       created_at bigint
     )`,
  );

  const last = await sql<{ created_at: string | null }[]>`
    SELECT created_at FROM drizzle.__drizzle_migrations ORDER BY created_at DESC LIMIT 1
  `;
  const lastCreatedAt = last.length && last[0]!.created_at !== null ? Number(last[0]!.created_at) : null;

  let applied = 0;
  for (const entry of journal.entries) {
    if (lastCreatedAt !== null && entry.when <= lastCreatedAt) continue;

    const file = readFileSync(
      new URL(`../drizzle/${entry.tag}.sql`, import.meta.url),
      "utf8",
    );
    const statements = file
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    const hash = createHash("sha256").update(file).digest("hex");

    // Una transacción POR archivo: el commit entre archivos evita el 55P04.
    await sql.begin(async (tx) => {
      for (const stmt of statements) {
        await tx.unsafe(stmt);
      }
      await tx`INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES (${hash}, ${entry.when})`;
    });

    console.log(`  ✓ ${entry.tag}`);
    applied++;
  }

  if (applied === 0) console.log("✅ Sin migraciones pendientes.");
  else console.log(`✅ ${applied} migración(es) aplicada(s).`);
}

console.log("🛠  Aplicando migraciones (una transacción por archivo)…");
main()
  .then(() => sql.end())
  .then(() => process.exit(0))
  .catch(async (err) => {
    console.error("❌ Error aplicando migraciones:", err);
    await sql.end().catch(() => {});
    process.exit(1);
  });
