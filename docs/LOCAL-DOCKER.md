# Entorno de desarrollo local con Docker

Levanta **todo bot-plataform en tu máquina** (backend + frontend + Postgres con
pgvector + Redis) con un solo comando, sin túnel SSH a Dokploy y con **data de
prueba** lista para ejercitar distintos escenarios.

> ¿Prefieres el flujo clásico (apps en el host + DB de dev remota por túnel)?
> Sigue en [`GETTING-STARTED.md`](GETTING-STARTED.md). Ambos modos conviven.

---

## TL;DR

```bash
make up      # build + levantar + migrar + cargar data de prueba
```

- Frontend → <http://localhost:5173>
- Backend  → <http://localhost:3000/health>
- Postgres → `localhost:5433` (user/pass/db: `botplatform`)

Para todo lo demás: `make help`.

---

## Requisitos

| Requisito | Detalle |
|---|---|
| **Docker** | con `docker compose` v2 (o `docker-compose` v1; el Makefile autodetecta) |
| **Make** | GNU Make (ya viene en macOS/Linux) |

No necesitas Node ni pnpm en el host: todo corre dentro de los contenedores.

---

## Qué levanta

| Servicio | Imagen / origen | Puerto host | Notas |
|---|---|---|---|
| `db` | `pgvector/pgvector:pg15` | `5433` | Trae la extensión `vector` (la exige el schema). El `initdb` la habilita. |
| `redis` | `redis:7-alpine` | `6379` | Reservado a la plataforma (hoy opcional). |
| `backend` | `infra/dev/Dockerfile` | `3000` | Hono con `tsx watch` (hot-reload). |
| `frontend` | `infra/dev/Dockerfile` | `5173` | Vite dev server con HMR. |

El **código se monta** desde el repo (bind-mount), así que editar en tu editor
recarga en caliente. Las dependencias viven en volúmenes propios del contenedor
(no se mezclan con las del host); el **primer arranque instala** y los siguientes
son instantáneos.

---

## Comandos (Makefile)

```bash
make up            # bootstrap completo (build + up + migrate + seed)
make start         # levantar sin migrar/sembrar
make up-infra      # solo Postgres + Redis (si quieres correr las apps en el host)
make down          # detener (conserva datos)
make down-v        # detener y BORRAR volúmenes (datos + node_modules)
make reset         # DB limpia desde cero (down -v + up + migrate + seed)

make migrate       # aplicar migraciones drizzle
make seed          # (re)cargar la data de prueba (idempotente)

make logs          # seguir logs (o logs-backend / logs-frontend)
make ps            # estado de los servicios
make psql          # psql interactivo en el contenedor db
make shell-backend # shell dentro del backend
make typecheck     # typecheck del workspace en el contenedor
make clean         # bajar todo + borrar volúmenes e imagen dev
```

---

## Variables de entorno

`make up` (o `make env`) crea dos archivos desde sus ejemplos la primera vez:

- **`.env.dev`** (raíz) → variables del **backend** y del compose.
- **`apps/frontend/.env`** → variables `VITE_*` del **frontend** (las lee Vite,
  igual que con `pnpm dev`; el compose no las inyecta porque pisaría la clave de
  Clerk del navegador).

Con los valores por defecto **el stack arranca y la API responde** contra la DB
local con la data de prueba. Para funcionalidades que dependen de servicios
externos:

- **Login real (Clerk):** en `.env.dev` pon `CLERK_SECRET_KEY` y
  `CLERK_PUBLISHABLE_KEY`; en `apps/frontend/.env` pon `VITE_CLERK_PUBLISHABLE_KEY`.
  Deben ser de la **misma instancia** de Clerk (con *Organizations* habilitado).
  Sin esto el backend arranca pero no hay login.
- **IA (respuestas del bot / indexado):** `ANTHROPIC_API_KEY` y `OPENAI_API_KEY`
  en `.env.dev`. La data de prueba ya trae chunks con embeddings sintéticos, así
  que el seed **no** necesita OpenAI.

> `DATABASE_URL` y `REDIS_URL` las fija el compose apuntando a los servicios `db`
> y `redis`; lo que pongas en `.env.dev` para esas dos se ignora.

---

## Data de prueba (escenarios)

`make seed` carga cuatro tenants, cada uno pensado para probar algo distinto. Es
**idempotente**: borra y reinserta los tenants de prueba en cada corrida.

| Tenant (org id) | Escenario | Qué ejercita |
|---|---|---|
| `org_seed_acme` | **Acme Tienda** — happy path | 1 bot + 1 agente (WhatsApp/Evolution), identidad (SOUL/IDENTITY/GUARDRAILS), conocimiento (fuente `ready` de texto, FAQ y una `failed`) con chunks, catálogo, reglas de teléfono, contacto con conversación en modo bot, generaciones, memoria, hechos y datos extraídos. |
| `org_seed_multi` | **Demo Multi-Agente** — ruteo E13 | 2 agentes y 3 canales (Telegram, WhatsApp Cloud, Instagram); ruteo canal→agente; **colección de conocimiento compartida** por ambos agentes (referencia viva); **contacto unificado** en 2 canales con memoria compartida; una conversación **escalada a humano** (handoff). |
| `org_seed_blocked` | **Cliente Bloqueado** | `tenants.blocked = true` para probar el gate de plataforma (`requireTenant`). |
| `org_seed_empty` | **Nuevo Tenant** | bot y agente en `draft`, sin canales ni conocimiento → estados vacíos de la UI. |

### Manejar la data desde la UI

Los `tenant_id` son ids de organización de Clerk. Como Clerk es externo, la data
sembrada usa ids sintéticos (`org_seed_*`). Para **operar un escenario desde la
interfaz** con login real, apunta el escenario Acme a **tu** organización de Clerk:

```bash
# en .env.dev
SEED_PRIMARY_TENANT=org_tuOrgIdRealDeClerk
```

y vuelve a sembrar: `make seed`. (Obtén tu org id en el dashboard de Clerk, o
créala desde la app y cópiala.) El resto de escenarios seguirán bajo sus ids
sintéticos — útiles para inspección directa con `make psql`.

### Inspección directa

```bash
make psql
# dentro de psql:
\dt                                            -- tablas
SELECT id, name, blocked FROM tenants;
SELECT name, status FROM agents;
SELECT type, display_name FROM channels;
```

---

## Solución de problemas

| Síntoma | Causa / arreglo |
|---|---|
| Puerto `5433`/`5173`/`3000` ocupado | Cambia `DB_PORT` / `FRONTEND_PORT` / `BACKEND_PORT` en `.env.dev` y `make down && make up`. |
| Primer `make up` tarda | Está construyendo la imagen e instalando dependencias (una sola vez). Mira `make logs`. |
| Cambié dependencias (`package.json`) y no se reflejan | El entrypoint reinstala al cambiar `pnpm-lock.yaml`; si no, `make restart` o `make down-v && make up`. |
| HMR del frontend no conecta | Asegúrate de entrar por `http://localhost:5173` (no por un host de túnel). El modo móvil/cloudflare usa `VITE_PUBLIC_HOST`. |
| El backend no recarga al editar | El polling ya está activo (`CHOKIDAR_USEPOLLING`). Si aun así no toma el cambio, `make restart`. |
| El bot no responde | Faltan `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` en `.env.dev`. |
| Quiero empezar de cero | `make reset` (borra volúmenes, re-migra y re-siembra). |
