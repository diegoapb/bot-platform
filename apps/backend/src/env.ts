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

  // Bootstrap de super admins: lista de Clerk user ids separados por coma.
  // (También se reconoce publicMetadata.role="superadmin" en Clerk.)
  SUPERADMIN_USER_IDS: z
    .string()
    .default("")
    .transform((s) => s.split(",").map((x) => x.trim()).filter(Boolean)),

  EVOLUTION_API_URL: z.string().url(),
  EVOLUTION_API_KEY: z.string().min(1),
  // Token que Evolution manda en cada webhook (header x-webhook-token).
  EVOLUTION_WEBHOOK_TOKEN: z.string().min(1),
  // Base pública de este backend, alcanzable desde Evolution/Chatwoot (túnel en dev).
  PUBLIC_WEBHOOK_BASE_URL: z.string().url(),

  CHATWOOT_API_URL: z.string().url(),
  CHATWOOT_API_TOKEN: z.string().min(1),
  // Token del Platform API de Chatwoot (provisión de cuentas/usuarios).
  CHATWOOT_PLATFORM_TOKEN: z.string().min(1),
  CHATWOOT_ACCOUNT_ID: z.coerce.number().default(1),
  // User id del dueño de CHATWOOT_API_TOKEN. Se adjunta como administrator a
  // cada cuenta de tenant para que el Application API pueda operarla.
  CHATWOOT_ADMIN_USER_ID: z.coerce.number().int().positive(),

  WEBHOOK_SECRET: z.string().min(1),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error("❌ Variables de entorno inválidas:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
