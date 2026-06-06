import { z } from "zod";

/** Validación de variables de entorno al arrancar. Falla rápido si falta algo. */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3000),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),

  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().optional(),

  CLERK_SECRET_KEY: z.string().min(1),
  CLERK_PUBLISHABLE_KEY: z.string().min(1),

  EVOLUTION_API_URL: z.string().url(),
  EVOLUTION_API_KEY: z.string().min(1),

  CHATWOOT_API_URL: z.string().url(),
  CHATWOOT_API_TOKEN: z.string().min(1),
  CHATWOOT_ACCOUNT_ID: z.coerce.number().default(1),

  WEBHOOK_SECRET: z.string().min(1),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error("❌ Variables de entorno inválidas:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
