# Plan de salida a producción — bot-platform (Dokploy)

> Complementa y actualiza [DEPLOY-PROD.md](DEPLOY-PROD.md). Recoge los requerimientos
> reales para producción, la **promoción a pgvector** (DB ya montada en Dokploy) y el
> procedimiento operativo usando **`ssh dokploy`** y la **CLI `cloudflared`** (instalada vía brew).
>
> Repo monorepo: `https://github.com/diegoapb/cloud-manager.git`
> Repo del submódulo que Dokploy realmente construye: `https://github.com/diegoapb/bot-platform.git`

---

## 0. Hallazgos / discrepancias que hay que resolver antes de salir

Detectados al revisar el código e infra (bloquean o condicionan el despliegue):

| # | Hallazgo | Impacto | Acción |
|---|---|---|---|
| H1 | ~~**pgvector NO está en uso.** Los embeddings se guardaban como `jsonb` y la similitud coseno se calculaba **en proceso**.~~ ✅ **Resuelto en código** (sección 4): `vector(1536)` + HNSW + búsqueda en SQL. Falta aplicar la migración en la DB. | — | Hecho; aplicar migración en deploy. |
| H2 | El compose apunta al Postgres **`labs` (postgres:15, SIN pgvector)** ([dokploy.json](../infra/dokploy/dokploy.json)), pero la instancia con pgvector es **`labs-vector` (pgvector/pgvector:pg15)** ([PGVECTOR.md](PGVECTOR.md)). | Si se promueve pgvector hay que decidir qué instancia usa el backend. | Decisión en sección 4.1. |
| H3 | La rama actual del submódulo es **`260612`**, pero Dokploy/DEPLOY-PROD usan **`main`**. | El auto-deploy escucha `main`; lo trabajado no saldría. | Merge/push a `main` antes de conectar el compose. |
| H4 | `dokploy.json` tiene `projectId`, `composeId`, `environmentId` y `domainId` en **`TBD`**. | El proyecto/compose aún no existen en Dokploy. | Crearlos (sección 5) y guardar IDs. |
| H5 | `pgvector-proxy` se creó con `docker run` directo (no lo gestiona Dokploy). | Riesgo de quedar fuera de inventario. | Documentado; solo afecta acceso local por túnel, no a prod. |

---

## 1. Requerimientos para producción (checklist)

### 1.1 Código / aplicación
- [x] **Migración a pgvector** implementada y migración drizzle generada (sección 4). *Pendiente: mergear a `main` y aplicar en DB.*
- [x] `pnpm typecheck` y `pnpm build` del backend sin errores (validar también `vite build` del frontend).
- [ ] Healthchecks vivos: backend `/health/live` (compose) y `/health` extendido (db/evolution/chatwoot) para el smoke.
- [ ] Rama `main` actualizada y pusheada al repo `bot-platform` (H3).

### 1.2 Infra Dokploy
- [ ] Proyecto `bot-plataform` + environment `production` creados (H4).
- [ ] Compose `docker-compose` conectado a GitHub (`diegoapb/bot-platform`, branch `main`, path `infra/dokploy/docker-compose.yml`, auto-deploy on push).
- [ ] **GitHub provider** conectado en Dokploy (Settings → Git Providers) con acceso al repo del submódulo.
- [ ] IDs guardados en `infra/dokploy/dokploy.json`.

### 1.3 Bases de datos
- [ ] DB+user de aplicación creados (Postgres compartido — decisión en 4.1).
- [ ] **pgvector** habilitado en la DB de aplicación (`CREATE EXTENSION vector`).
- [ ] Migraciones aplicadas (incluida la de la columna `vector` + índice HNSW).
- [ ] Redis: índice `5` reservado (no colisiona con Postiz=2/Chatwoot=3/Evolution=4).

### 1.4 DNS / Cloudflare
- [ ] Registros `sira` y `api.sira` en zona `opensolvex.co` apuntando al host (`195.26.253.145`).
- [ ] Empezar en **DNS only (gris)** para que LetsEncrypt emita certificados; luego, opcional, proxy naranja + SSL **Full (strict)**.

### 1.5 Identidad / secretos (Clerk + APIs)
- [ ] Clerk app **producción** con **Organizations habilitado**; `sk_live_…` / `pk_live_…`.
- [ ] `https://sira.opensolvex.co` agregado en Clerk → Domains.
- [ ] `SUPERADMIN_USER_IDS` con tu `user_…` tras el primer login.
- [ ] `EVOLUTION_API_KEY`, `EVOLUTION_WEBHOOK_TOKEN` (nuevo), `WEBHOOK_SECRET` (nuevo).
- [ ] `CHATWOOT_API_TOKEN`, `CHATWOOT_PLATFORM_TOKEN`, `CHATWOOT_ACCOUNT_ID`, `CHATWOOT_ADMIN_USER_ID`.
- [ ] `ANTHROPIC_API_KEY` (+ `LLM_MODEL=claude-haiku-4-5-20251001`) y `OPENAI_API_KEY` (sin ella la base de conocimiento queda en `failed`).

### 1.6 Seguridad / operación
- [ ] Secretos solo en el Environment de Dokploy (nunca en el repo).
- [ ] Rotar la `ANTHROPIC_API_KEY` temporal de pruebas tras el deploy.
- [ ] Backups del Postgres (cubierto si el host tiene backups de Dokploy).
- [ ] Verificar aislamiento dev/prod (instancias Evolution `bot-<botId>` y DB separadas).

---

## 2. Acceso al host: `ssh dokploy` y `cloudflared`

Cloudflare bloquea los puertos externos de los recursos Dokploy (memoria `dokploy_external_access`), así que **toda** operación sobre DB/host se hace por SSH al host, no con psql directo desde local.

```bash
# Host ya configurado en ~/.ssh/config (Host dokploy → 195.26.253.145, user woofly)
ssh dokploy "docker ps"            # inventario de contenedores
```

**CLI Cloudflare disponible:** `cloudflared` (`/opt/homebrew/bin/cloudflared`).
Útil aquí para:
- **Verificar/diagnosticar DNS** y, si se quiere, montar un **tunnel** como ingress alternativo
  a abrir un A-record al IP del host:
  ```bash
  cloudflared tunnel login
  cloudflared tunnel create bot-platform
  cloudflared tunnel route dns bot-platform sira.opensolvex.co
  cloudflared tunnel route dns bot-platform api.sira.opensolvex.co
  ```
  > Nota: los registros DNS A/CNAME “normales” se gestionan en el dashboard de Cloudflare
  > (o vía API). `cloudflared` no edita records sueltos salvo en el flujo de `tunnel route dns`.

---

## 3. Túnel a la base de datos (para migraciones desde local)

```bash
# pgvector (labs-vector) — proxy socat en 127.0.0.1:8680 del host
ssh -N -L 5433:localhost:8680 dokploy
# DATABASE_URL local: postgresql://chatwoot:...@localhost:5433/<db>
```

Para el Postgres `labs` (si se mantiene como DB de app) se usa el túnel equivalente
documentado en DEPLOY-PROD §2.

---

## 4. Promoción a pgvector (la pieza nueva)

Objetivo: dejar de cargar todos los chunks en memoria y delegar la búsqueda
semántica a Postgres con tipo `vector` + índice **HNSW** y operador `<->`.

### 4.1 Decisión de instancia (resuelve H2)
La extensión `vector` solo existe en la instancia **`labs-vector`** (`pgvector/pgvector:pg15`),
no en `labs` (`postgres:15`). Dos caminos:

- **(Recomendado) Una sola DB de app sobre `labs-vector`.** Crear DB dedicada
  `botplatform` en `labs-vector` (la misma instancia que ya tiene la extensión) y
  apuntar `DATABASE_URL` ahí. Toda la app (incluida la búsqueda) en una sola DB con pgvector.
  ```bash
  ssh dokploy "docker exec \$(docker ps -q -f name=labs-vector) \
    psql -U chatwoot -c \"CREATE DATABASE botplatform OWNER chatwoot;\""
  ssh dokploy "docker exec \$(docker ps -q -f name=labs-vector) \
    psql -U chatwoot -d botplatform -c 'CREATE EXTENSION IF NOT EXISTS vector;'"
  ```
  `DATABASE_URL=postgresql://chatwoot:<pwd>@labs-vector-uvatca:5432/botplatform`
  (host interno en `dokploy-network`; el `.env.example` debe actualizarse para no usar `databases-labs-bkbvsy`).

- **(Alternativa) DB de app en `labs` + DB de vectores en `labs-vector`.** Mantiene la
  app en `labs` y solo los embeddings en `labs-vector_`. Requiere una segunda conexión
  (`VECTOR_DATABASE_URL`) en el backend. Más complejo; solo si hay razón para no mover la app.

### 4.2 Cambios de código (backend) — ✅ IMPLEMENTADO
1. **Schema** ([schema.ts:345-379](../apps/backend/src/db/schema.ts#L345-L379)): `embedding` pasa de `jsonb`
   a `vector("embedding", { dimensions: 1536 })` (tipo nativo de `drizzle-orm/pg-core`) + índice
   HNSW `knowledge_chunks_embedding_hnsw` con `vector_cosine_ops`.
2. **retrieve()** ([knowledge.ts:171-200](../apps/backend/src/services/knowledge.ts#L171-L200)): el
   `select all + cosineSimilarity` en JS se reemplazó por una query SQL
   `score = 1 - (embedding <=> $query::vector)`, con `WHERE botId AND score >= minScore`,
   `ORDER BY score DESC` y `LIMIT k`. La firma y el tipo `ScoredChunk` no cambian.
3. **embeddings.ts**: `cosineSimilarity` ya no se usa en retrieval (se conserva el export por si hace falta en tests).
4. Comentario de deuda técnica del schema actualizado.

> Verificado: `pnpm typecheck` y `pnpm build` pasan.

### 4.3 Migración de datos / migraciones drizzle — ✅ GENERADA
Migración [`drizzle/0007_great_stryfe.sql`](../apps/backend/drizzle/0007_great_stryfe.sql):
- `ALTER COLUMN embedding SET DATA TYPE vector(1536) USING embedding::text::vector(1536)` — el
  `USING` castea los embeddings jsonb existentes, así es segura en DB vacía (prod) **y** con datos (dev);
  no requiere re-indexar.
- `CREATE INDEX ... USING hnsw (embedding vector_cosine_ops)`.

**Prerequisito (una vez, como superuser — NO el user de app):** crear la extensión antes de migrar.
pgvector no es "trusted", así que `CREATE EXTENSION` necesita superuser y se ejecuta por SSH:
```bash
ssh dokploy "docker exec \$(docker ps -q -f name=labs-vector) \
  psql -U chatwoot -d botplatform -c 'CREATE EXTENSION IF NOT EXISTS vector;'"
```
Luego, con el túnel SSH abierto y `DATABASE_URL` apuntando a la DB de app:
```bash
cd apps/backend && pnpm db:migrate
```

---

## 5. Despliegue en Dokploy (skill `dokploy-api`)

> Ruta skill: `_system/dokploy/skills/dokploy-api/scripts`. Comandos completos en
> [infra/dokploy/README.md](../infra/dokploy/README.md). Resumen:

```bash
# 1) Proyecto (crea env "production")
python3 <skill>/dokploy_client.py POST /project.create \
  name=bot-plataform description="Bots sobre Evolution API + Chatwoot"

# 2) Compose conectado a GitHub (repo del submódulo)
python3 <skill>/deploy_compose_from_github.py \
  --project-id <PROJECT_ID> --env-name production \
  --name bot-plataform --owner diegoapb --repo bot-platform --branch main \
  --compose-path infra/dokploy/docker-compose.yml --auto-deploy

# 3) Pegar Environment (.env del compose) con secretos reales (ver .env.example actualizado)

# 4) Dominios (Traefik + LetsEncrypt)
python3 <skill>/add_domain.py --compose-id <COMPOSE_ID> --host sira.opensolvex.co     --service-name frontend --port 80
python3 <skill>/add_domain.py --compose-id <COMPOSE_ID> --host api.sira.opensolvex.co --service-name backend  --port 3000

# 5) Deploy + tail
python3 <skill>/dokploy_client.py POST /compose.deploy composeId=<COMPOSE_ID>
python3 <skill>/tail_deployment.py --compose-id <COMPOSE_ID> --watch
```
Guardar `projectId/environmentId/composeId/domainId` en `dokploy.json` (H4).

---

## 6. Verificación (smoke)

```bash
node scripts/smoke-prod.mjs --backend https://api.sira.opensolvex.co --frontend https://sira.opensolvex.co
```
Espera `Smoke OK ✅`: health con db/evolution/chatwoot arriba, frontend sirviendo HTML,
webhooks rechazando tokens inválidos (401). Verificar pgvector explícitamente:
```bash
ssh dokploy "docker exec \$(docker ps -q -f name=labs-vector) \
  psql -U chatwoot -d botplatform -c \"SELECT extversion FROM pg_extension WHERE extname='vector';\""
```

---

## 7. Primer tenant real y post-deploy

Seguir DEPLOY-PROD §9–§10:
1. Login en `https://sira.opensolvex.co` → crear organización → bot → conectar WhatsApp (QR) → provisionar Chatwoot.
2. Cargar identidad, conocimiento (verificar que las fuentes pasan a `ready`, no `failed`) y catálogo.
3. WhatsApp de prueba: respuesta <15 s, visible en Conversaciones, con traza.

Post-deploy:
- [ ] Rotar `ANTHROPIC_API_KEY` temporal.
- [ ] Activar proxy naranja Cloudflare (opcional) + SSL Full (strict).
- [ ] Confirmar backups del Postgres.
- [ ] Verificar índice HNSW en uso (`EXPLAIN` de una query de retrieval).

---

## 8. Orden de ejecución sugerido

1. Resolver código: migración pgvector (4.2) + `db:generate` (4.3) → merge a `main` (H3) → push.
2. Crear DB `botplatform` en `labs-vector` + `CREATE EXTENSION vector` (4.1).
3. DNS en Cloudflare (DNS only).
4. Clerk prod + recolectar todos los secretos (1.5).
5. Crear proyecto/compose/dominios en Dokploy (5) y pegar Environment.
6. Aplicar migraciones por túnel SSH (4.3).
7. Deploy + tail → smoke (6).
8. Primer tenant + post-deploy (7).
</content>
</invoke>
