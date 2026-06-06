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

La DB de dev se crea **una vez** en Dokploy y se reutiliza. Dos formas:

### Opción A — recurso Postgres dedicado (con la skill dokploy-api) · recomendada

Crea un recurso aislado solo para dev:

```bash
SKILL=_system/dokploy/skills/dokploy-api/scripts

# 1) Crear el recurso en el proyecto "databases" (env production)
python3 - <<'PY'
import sys; sys.path.insert(0, "_system/dokploy/skills/dokploy-api/scripts")
from dokploy_client import DokployClient
import secrets
c = DokployClient.from_env()
pwd = secrets.token_hex(24)                       # password apto para Dokploy
pg = c.postgres.create(
    name="botplatform-dev", appName="botplatform-dev",
    environmentId="v7SEBV4M77jY2BPe5g1ST",        # databases / production
    databaseName="botplatform", databaseUser="botplatform",
    databasePassword=pwd, dockerImage="postgres:15",
)
pid = pg["postgresId"]
c.postgres.save_external_port(postgresId=pid, externalPort=8679)  # para el túnel
c.postgres.deploy(postgresId=pid)
print("postgresId:", pid)
print("externalPort: 8679")
print("DATABASE_URL=postgresql://botplatform:%s@localhost:5432/botplatform" % pwd)
PY
```

Guarda el `DATABASE_URL` que imprime en `apps/backend/.env` (apunta a `localhost:5432`, que es la **boca local del túnel** del paso 6).

### Opción B — base de datos sobre el Postgres compartido `labs`

Si prefieres no crear un contenedor nuevo, crea solo una DB en el `labs` existente (vía SSH, auth por socket):

```bash
ssh dokploy 'docker exec -i $(docker ps -q -f name=databases-labs-bkbvsy | head -1) \
  psql -U joadsckldf -d postgres -v ON_ERROR_STOP=1' <<SQL
CREATE USER botplatform WITH PASSWORD 'PON_UNA_PASSWORD';
CREATE DATABASE botplatform_dev OWNER botplatform;
GRANT ALL PRIVILEGES ON DATABASE botplatform_dev TO botplatform;
SQL
```

En este caso el túnel apunta al puerto de `labs` (**8678**) y el `DATABASE_URL` usa la DB `botplatform_dev`.

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
CORS_ORIGIN=http://localhost:5173
# La boca local del túnel SSH (paso 6) — Opción A:
DATABASE_URL=postgresql://botplatform:<pwd>@localhost:5432/botplatform
# (Opción B: .../botplatform_dev)
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
./scripts/dev-tunnel.sh        # o: ssh -N -L 5432:localhost:8679 dokploy
```

(Opción B: usa el puerto **8678**.)

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

## 8. (Opcional) Webhooks entrantes en local

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
| DB de dev (boca del túnel) | `:5432` → Dokploy `:8679` (A) / `:8678` (B) |

---

## Troubleshooting

| Síntoma | Causa probable |
|---|---|
| `db:migrate` cuelga o `ECONNREFUSED` | Túnel SSH cerrado → reabre el paso 6 |
| Backend no arranca, error de env | Falta alguna var obligatoria en `.env` (Clerk, DATABASE_URL) |
| "Selecciona o crea un tenant" en toda la API | No has creado tu organización en Clerk (paso 7) |
| No aparece `/admin` | Tu `user_…` no está en `SUPERADMIN_USER_IDS` |
| 401 en `/api/*` | Token de Clerk no enviado / claves `pk`/`sk` cruzadas entre apps |
