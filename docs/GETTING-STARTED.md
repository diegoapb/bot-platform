# Getting Started (desarrolladores)

Guía para levantar **bot-plataform** en local y hacer tu primer deployment de desarrollo. La base de datos de dev vive en **Dokploy** y se consume desde local vía **túnel SSH**.

> Tiempo estimado: ~15 min · Para el despliegue a producción ver [`infra/dokploy/README.md`](../infra/dokploy/README.md).

---

## TL;DR

```bash
pnpm install
cp apps/backend/.env.example  apps/backend/.env     # rellenar Clerk + DATABASE_URL
cp apps/frontend/.env.example apps/frontend/.env    # rellenar Clerk pk_
./scripts/dev-tunnel.sh &                           # túnel a la DB de dev (Dokploy)
pnpm db:migrate                                     # aplicar migraciones
pnpm dev                                            # backend :3000 + frontend :5173
```

---

## 1. Requisitos previos

| Requisito | Versión / detalle |
|---|---|
| **Node** | ≥ 20 (probado en 24) |
| **pnpm** | ≥ 9 (`corepack enable`) |
| **Acceso SSH al host Dokploy** | alias `dokploy` en `~/.ssh/config` (`woofly@195.26.253.145`) — necesario para el túnel a la DB de dev |
| **Cuenta Clerk** | gratis — para la instancia de auth de dev |
| **(opcional) cloudflared / ngrok** | solo si vas a probar **webhooks entrantes** de Evolution/Chatwoot hacia tu backend local |

> No necesitas Docker ni Postgres local: la DB de dev está en Dokploy.

---

## 2. Instalar dependencias

```bash
pnpm install
```

Monorepo pnpm: instala backend, frontend y el paquete compartido de una vez.

---

## 3. Configurar Clerk (auth)

1. Crea una aplicación en <https://dashboard.clerk.com> (instancia de **desarrollo**).
2. **Habilita Organizations**: *Configure → Organizations* → Enable. (Sin esto el registro de tenants no funciona — el multitenancy depende de esto.)
3. Copia las claves de *API Keys*:
   - `pk_test_…` → frontend (`VITE_CLERK_PUBLISHABLE_KEY`)
   - `sk_test_…` y `pk_test_…` → backend (`CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`)
4. **Super admin** (opcional pero recomendado): regístrate una vez en la app local, copia tu `user_…` (Clerk dashboard → Users) y ponlo en `SUPERADMIN_USER_IDS` del backend. Así tendrás acceso al dashboard de plataforma (`/admin`).

---

## 4. Base de datos de desarrollo (Dokploy)

> **Ya está montada** sobre la instancia compartida **`labs-vector`** (`pgvector/pgvector:pg15`,
> extensión `vector 0.8.2`). El schema usa la columna `vector(1536)` + índice HNSW, así que la DB
> de dev **debe** tener pgvector — por eso ya **no** se usa el viejo recurso `botplatform-dev`
> (`postgres:15`, sin pgvector), que queda obsoleto.

| Campo | Valor |
|---|---|
| Instancia | `labs-vector` (`labs-vector-uvatca`, `dokploy-network`) |
| Database | `botplatform_dev` |
| Usuario | `botplatform_dev` (rol propio, no el superuser `chatwoot`) |
| Password | en `apps/backend/.env` (no se versiona) |
| Acceso local | túnel SSH `5432 → proxy socat 8680 → labs-vector:5432` |

La DB y el usuario se crearon **una sola vez** así (vía SSH, como superuser `chatwoot`):

```bash
C=$(ssh dokploy "docker ps -q -f name=labs-vector")
ssh dokploy "docker exec \$C psql -U chatwoot -d chatwoot \
  -c \"CREATE USER botplatform_dev WITH PASSWORD '<pwd>';\""
ssh dokploy "docker exec \$C psql -U chatwoot -d chatwoot \
  -c \"CREATE DATABASE botplatform_dev OWNER botplatform_dev;\""
# La extensión la crea el superuser DENTRO de la nueva DB (pgvector no es 'trusted'):
ssh dokploy "docker exec \$C psql -U chatwoot -d botplatform_dev \
  -c 'CREATE EXTENSION IF NOT EXISTS vector;'"
```

> Si necesitas resetear la DB de dev: `DROP DATABASE botplatform_dev` y repetir los 3 pasos.

---

## 5. Variables de entorno

```bash
cp apps/backend/.env.example  apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env
```

**`apps/backend/.env`** (mínimo para arrancar):

```ini
NODE_ENV=development
PORT=3000
# Coma-separados. Añade el host del túnel si vas a usar el paso 9 (probar desde celular).
CORS_ORIGIN=http://localhost:5173,https://bot-dev.tusolvex.com
# Boca local del túnel SSH (paso 6) -> labs-vector (pgvector). DB y user "botplatform_dev".
DATABASE_URL=postgresql://botplatform_dev:<pwd>@localhost:5432/botplatform_dev
CLERK_SECRET_KEY=sk_test_…
CLERK_PUBLISHABLE_KEY=pk_test_…
SUPERADMIN_USER_IDS=user_tuId        # opcional
# Integraciones (públicas, funcionan desde local):
EVOLUTION_API_URL=https://evolutionapi.diegop.com
EVOLUTION_API_KEY=…
CHATWOOT_API_URL=https://chatwoot.diegop.com
CHATWOOT_API_TOKEN=…
WEBHOOK_SECRET=cualquier-cosa-en-dev
```

**`apps/frontend/.env`**:

```ini
# Vacío → el frontend usa el proxy /api de Vite hacia :3000 (sin CORS)
VITE_API_URL=
VITE_CLERK_PUBLISHABLE_KEY=pk_test_…
```

> Los `.env` están en `.gitignore`; nunca se versionan.

---

## 6. Abrir el túnel a la DB de dev

El túnel mapea `localhost:5432` (local) → la DB de dev en el host Dokploy. Déjalo abierto mientras desarrollas:

```bash
./scripts/dev-tunnel.sh        # o: ssh -N -L 5432:localhost:8680 dokploy
```

> `8680` es el proxy socat del host hacia `labs-vector` (pgvector). Ver [PGVECTOR.md](PGVECTOR.md).

---

## 7. Migraciones y arranque

```bash
pnpm db:migrate     # aplica drizzle/*.sql sobre la DB de dev (necesita el túnel abierto)
pnpm dev            # backend :3000 + frontend :5173
```

Abre <http://localhost:5173>. Flujo esperado: login (Clerk) → crear tu organización (tenant, quedas `org:admin`) → dashboard de bots. Si eres super admin, verás *Plataforma* (`/admin`).

**Verificación rápida:**

```bash
curl http://localhost:3000/health        # {"ok":true,...}
curl http://localhost:3000/health/ready  # {"ok":true,"db":"up"}  ← confirma la DB vía túnel
```

---

## 8. (Opcional) Probar desde el celular con HMR en vivo

Túnel público al **frontend Vite** vía Cloudflare Tunnel, con subdominio fijo (`bot-dev.tusolvex.com`). El backend no se tuneliza: el proxy `/api` de Vite lo expone a través del mismo túnel.

**Requisitos una vez:**

1. `brew install cloudflared`.
2. El tunnel `bot-plataform-dev` y el CNAME `bot-dev.tusolvex.com` ya están creados en Cloudflare (cuenta `Dap465@gmail.com`, zona `tusolvex.com`). Credenciales locales en `~/.cloudflared/`.
3. **Clerk dashboard** (instancia dev) → *Domains* → añadir `bot-dev.tusolvex.com`. Sin esto, el login no completa.
4. **Backend `.env`** debe incluir el host en `CORS_ORIGIN` (ver paso 5). Se usa también para `authorizedParties` de Clerk; sin esto los requests autenticados dan **401**.

**Cada vez:**

```bash
pnpm dev:mobile      # arranca backend + frontend + cloudflared en paralelo
# o en terminales separadas:
pnpm dev
pnpm tunnel
```

Abre <https://bot-dev.tusolvex.com> desde el celular o cualquier red.

> El `vite.config.ts` ya tiene `host: true`, `allowedHosts` y HMR sobre `wss://bot-dev.tusolvex.com:443`, así que los cambios se ven en vivo.

---

## 9. (Opcional) Webhooks entrantes en local

Evolution/Chatwoot no pueden alcanzar `localhost`. Para probar recepción de mensajes, expón tu backend con un túnel público y registra esa URL:

```bash
cloudflared tunnel --url http://localhost:3000
# Registra https://<sub>.trycloudflare.com/webhooks/evolution?secret=<WEBHOOK_SECRET>
#       y  https://<sub>.trycloudflare.com/webhooks/chatwoot?secret=<WEBHOOK_SECRET>
```

---

## Resumen de puertos

| Servicio | Local |
|---|---|
| Backend (Hono) | `:3000` |
| Frontend (Vite) | `:5173` |
| DB de dev (boca del túnel) | `:5432` → Dokploy `:8680` → `labs-vector` (pgvector) |

---

## Troubleshooting

| Síntoma | Causa probable |
|---|---|
| `db:migrate` cuelga o `ECONNREFUSED` | Túnel SSH cerrado → reabre el paso 6 |
| Backend no arranca, error de env | Falta alguna var obligatoria en `.env` (Clerk, DATABASE_URL) |
| "Selecciona o crea un tenant" en toda la API | No has creado tu organización en Clerk (paso 7) |
| No aparece `/admin` | Tu `user_…` no está en `SUPERADMIN_USER_IDS` |
| 401 en `/api/*` | Token de Clerk no enviado / claves `pk`/`sk` cruzadas entre apps |
| 401 al entrar por `bot-dev.tusolvex.com` | Falta el host en `CORS_ORIGIN` (alimenta `authorizedParties` de Clerk) — ver paso 8 |
| Login en `bot-dev.tusolvex.com` se queda tras la contraseña | Host no autorizado en el dashboard de Clerk (*Domains*) |
