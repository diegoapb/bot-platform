# Informe de avance — Entorno de desarrollo local (DB de dev + `.env`)

**Proyecto:** bot-plataform · **Sección:** puesta en marcha del entorno local (backend + frontend)
**Estado:** ✅ backend arranca y conecta a la DB de dev · ⏳ pendiente: claves Evolution/Chatwoot y habilitar Organizations en Clerk
**Stack afectado:** infra (Dokploy/Postgres) · backend (Hono) · frontend (Vite) · base de datos (Drizzle/Postgres)
**Guía seguida:** [`docs/GETTING-STARTED.md`](../GETTING-STARTED.md) — Opción A (recurso Postgres dedicado)

---

## 1. Resumen ejecutivo

Se dejó operativo el entorno de **desarrollo local** para correr backend y frontend contra una base de datos de dev alojada en **Dokploy** y consumida vía **túnel SSH**. Se provisionó un recurso Postgres dedicado, se aplicaron las migraciones, se generaron los `.env` de ambas apps y se verificó el arranque del backend de extremo a extremo (`/health/ready` → `db: up`).

Durante la verificación se detectó y corrigió un **hueco real del repo**: el backend no cargaba el `.env` en runtime (no existía `dotenv` ni `--env-file`), por lo que sin el fix el arranque local fallaba con todas las variables como "Required".

---

## 2. Base de datos de dev (Dokploy)

Recurso Postgres **dedicado** creado con la skill `dokploy-api` (Opción A del Getting Started, la recomendada), en el proyecto `databases` / env `production`.

| Campo | Valor |
|---|---|
| Recurso | `botplatform-dev` |
| `postgresId` | `NnwhudTETC5AP2BCanLJa` |
| `appName` (hostname interno) | `botplatform-dev-kibujj` |
| Imagen | `postgres:15` (15.18) |
| DB / usuario | `botplatform` / `botplatform` |
| Puerto externo (túnel) | `8679` |
| Estado | `done` · contenedor `running` |
| Credenciales (fuera del repo) | `~/.config/botplatform-dev-db.txt` (`chmod 600`) |

**Túnel SSH** (boca local `:5432` → host Dokploy `:8679`): [`scripts/dev-tunnel.sh`](../../scripts/dev-tunnel.sh) (ya trae `REMOTE_PORT=8679` por defecto).

### Verificación de la DB
- Conexión + auth OK (`current_user=botplatform`).
- Permisos de escritura OK: `CREATE TABLE` → `INSERT` → `SELECT` → `DROP` sin errores (tabla de prueba eliminada al terminar).

### Migraciones
`pnpm db:migrate` aplicado contra la DB de dev. Tablas creadas:

- `tenants`
- `bots`
- `bot_assignments`

> Nota: `drizzle-kit` carga `.env` por su cuenta, por eso `db:migrate` funcionó sin cambios.

---

## 3. Variables de entorno (`.env` generados)

Ambos archivos están en `.gitignore` (verificado con `git check-ignore`).

### `apps/backend/.env`
- `DATABASE_URL` → recurso `botplatform-dev` vía túnel (`localhost:5432`). **Resuelto.**
- `CLERK_SECRET_KEY` / `CLERK_PUBLISHABLE_KEY` → instancia de dev. **Resuelto** (claves aportadas por el USER).
- `SUPERADMIN_USER_IDS=user_3EkZ1zJw7VL61bHyZ2pswJoXYge`. **Resuelto.**
- `WEBHOOK_SECRET` → valor de dev generado. **Resuelto.**
- `REDIS_URL` → opcional (el backend arranca sin Redis); dejado comentado. **Omitido a propósito.**
- `EVOLUTION_API_URL` / `CHATWOOT_API_URL` → URLs públicas. **Resuelto.**
- `EVOLUTION_API_KEY` / `CHATWOOT_API_TOKEN` → **`CHANGE_ME`** (placeholder; ver Pendientes).

### `apps/frontend/.env`
- `VITE_API_URL=` (vacío → proxy `/api` de Vite hacia `:3000`, sin CORS). **Resuelto.**
- `VITE_CLERK_PUBLISHABLE_KEY` → misma instancia de dev. **Resuelto.**

---

## 4. Fix aplicado al repo (carga de `.env` en runtime)

**Problema:** [`apps/backend/src/env.ts`](../../apps/backend/src/env.ts) hace `envSchema.safeParse(process.env)` directamente, pero no había ningún cargador de `.env` (`dotenv` ausente, sin `--env-file`). Resultado: `pnpm dev` abortaba con todas las variables "Required".

**Solución (mínima, cero dependencias, nativa de Node 24):** se añadió `--env-file=.env` al script `dev` del backend en [`apps/backend/package.json`](../../apps/backend/package.json):

```diff
- "dev": "tsx watch src/index.ts",
+ "dev": "tsx watch --env-file=.env src/index.ts",
```

**No afecta producción:** Dokploy ejecuta `start` (`node dist/index.js`) con las variables inyectadas en el entorno del contenedor, no el script `dev`.

---

## 5. Verificación end-to-end

Con el túnel abierto y `pnpm dev`:

```
GET /health        → {"ok":true,"service":"bot-plataform-backend"}
GET /health/ready  → {"ok":true,"db":"up"}     ← confirma DB vía túnel
```

Backend escuchando en `:3000`. ✅

---

## 6. Cómo levantar el entorno

```bash
cd projects/bot-plataform
./scripts/dev-tunnel.sh &   # túnel a la DB de dev (:5432 → Dokploy :8679)
pnpm dev                    # backend :3000 + frontend :5173
```

---

## 7. Archivos tocados

| Archivo | Cambio |
|---|---|
| `apps/backend/.env` | **Creado** (DATABASE_URL real, Clerk, superadmin, webhook secret, placeholders Evolution/Chatwoot). No versionado. |
| `apps/frontend/.env` | **Creado** (Clerk pk + proxy Vite). No versionado. |
| `apps/backend/package.json` | Script `dev`: `+ --env-file=.env`. |
| Dokploy (remoto) | Recurso Postgres `botplatform-dev` creado y desplegado. |
| `~/.config/botplatform-dev-db.txt` | Credenciales de la DB de dev (fuera del repo, `chmod 600`). |

> No se hizo ningún commit (los commits los hace el USER).

---

## 8. Pendientes

### Bloquean la integración (el backend arranca, pero estas llamadas fallan hasta resolverlas)

1. **`EVOLUTION_API_KEY`** — apikey global de la instancia Evolution (header `apikey`).
   - Origen: Dokploy → compose `Evolution API` → Environment → `AUTHENTICATION_API_KEY`.
   - Verificar: `curl -H "apikey: <KEY>" https://evolutionapi.diegop.com/instance/fetchInstances`
2. **`CHATWOOT_API_TOKEN`** — Access Token de usuario (header `api_access_token`); confirmar también `CHATWOOT_ACCOUNT_ID` (puesto a `1`).
   - Origen: Chatwoot → *Profile Settings* → *Access Token*.
   - Verificar: `curl -H "api_access_token: <TOKEN>" https://chatwoot.diegop.com/api/v1/accounts/1/conversations`

### Paso manual en Clerk

3. **Habilitar Organizations** en el dashboard de Clerk (*Configure → Organizations → Enable*). Sin esto el alta de tenants (multitenancy) no funciona.

### Opcionales

4. **Webhooks entrantes en local** (recibir mensajes): requiere `cloudflared`/ngrok y registrar la URL pública en Evolution/Chatwoot (paso 8 del Getting Started).
5. **Redis en dev**: omitido (opcional). Si se necesita, levantar túnel al Redis compartido (extPort 6379) y descomentar `REDIS_URL` (db index 5).

---

> **Oferta abierta:** las claves de Evolution y Chatwoot (puntos 1 y 2) puedo sacarlas yo de los Environments de Dokploy vía la skill `dokploy-api` (son tus propios servicios) y dejarlas puestas en el `.env` — dime si quieres que lo haga. No he commiteado nada.
