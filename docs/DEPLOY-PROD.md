# Salida a producción — Dokploy + Cloudflare

Paso a paso para desplegar bot-plataform en producción. Complementa `infra/dokploy/README.md` (que tiene los comandos exactos de la skill `dokploy-api`).

## 0. Pre-requisitos (una sola vez)

- Acceso a Cloudflare (zona `diegop.com`), a Dokploy (`https://dokploy.diegop.com`) y SSH al host.
- Repo `bot-plataform` accesible desde el Git Provider conectado en Dokploy (Settings → Git Providers).

## 1. DNS en Cloudflare

En la zona `diegop.com` crear 2 registros:

| Tipo | Nombre | Contenido | Proxy |
|---|---|---|---|
| A (o CNAME) | `bots` | IP del host Dokploy | **DNS only (gris)** al inicio |
| A (o CNAME) | `api.bots` | IP del host Dokploy | **DNS only (gris)** al inicio |

> Empezar en "DNS only" para que LetsEncrypt (Traefik) pueda emitir los certificados. Una vez emitidos puedes activar el proxy naranja si quieres; si lo haces, en Cloudflare → SSL/TLS poner modo **Full (strict)**.

## 2. Base de datos en el Postgres compartido `labs`

SSH al host Dokploy y dentro del contenedor de Postgres:

```sql
CREATE USER botplatform WITH PASSWORD '<genera-uno-fuerte>';
CREATE DATABASE botplatform OWNER botplatform;
GRANT ALL PRIVILEGES ON DATABASE botplatform TO botplatform;
```

> Si reutilizas la DB de dev actual, salta este paso — pero lo recomendado es separar dev y prod.

Aplicar migraciones desde tu máquina (túnel SSH al Postgres):

```bash
cd apps/backend
DATABASE_URL=postgresql://botplatform:<password>@localhost:<puerto-tunel>/botplatform pnpm db:migrate
```

## 3. Clerk de producción

1. En Clerk crear la **app de producción** (o promover la actual) con **Organizations habilitado**.
2. Anotar `sk_live_…` y `pk_live_…`.
3. En Clerk → Domains agregar `https://bots.diegop.com`.
4. Tras el primer login en prod, copiar tu `user_…` a `SUPERADMIN_USER_IDS`.

## 4. Proyecto + compose en Dokploy

Con la skill `dokploy-api` (comandos completos en `infra/dokploy/README.md`):

1. Crear proyecto `bot-plataform` (environment `production`).
2. Crear compose tipo `docker-compose` apuntando a GitHub: repo del monorepo, branch `main`, path `infra/dokploy/docker-compose.yml`, auto-deploy on push.
3. Guardar los IDs generados en `infra/dokploy/dokploy.json` (campos TBD).

## 5. Environment del compose

Pegar en Dokploy → Compose → Environment el contenido de `infra/dokploy/.env.example` con valores reales:

- `CORS_ORIGIN=https://bots.diegop.com`, `PUBLIC_WEBHOOK_BASE_URL=https://api.bots.diegop.com`, `VITE_API_URL=https://api.bots.diegop.com`
- `DATABASE_URL` (paso 2), Clerk live (paso 3), tokens de Evolution/Chatwoot
- `EVOLUTION_WEBHOOK_TOKEN` y `WEBHOOK_SECRET`: generar valores nuevos (no reusar dev)
- `ANTHROPIC_API_KEY` (+ `LLM_MODEL=claude-haiku-4-5-20251001`; para demos: `claude-opus-4-8`)
- `OPENAI_API_KEY` (sin ella la base de conocimiento no indexa)

## 6. Dominios en Dokploy

Agregar al compose (Traefik + LetsEncrypt):

- `bots.diegop.com` → service `frontend`, puerto 80, HTTPS
- `api.bots.diegop.com` → service `backend`, puerto 3000, HTTPS

## 7. Deploy

```bash
# vía skill dokploy-api
POST /compose.deploy composeId=<COMPOSE_ID>
```

Seguir logs hasta que ambos servicios queden healthy (el backend tiene healthcheck a `/health/live`).

## 8. Verificación (smoke)

```bash
node scripts/smoke-prod.mjs --backend https://api.bots.diegop.com --frontend https://bots.diegop.com
```

Debe dar `Smoke OK ✅` (health con db/evolution/chatwoot arriba, frontend sirviendo HTML, webhooks rechazando tokens inválidos).

## 9. Primer tenant real

1. Login en `https://bots.diegop.com` → crear organización (tenant).
2. Crear bot → conectar WhatsApp (QR) → provisionar Chatwoot.
   - La provisión registra automáticamente los webhooks usando `PUBLIC_WEBHOOK_BASE_URL` — no hay que configurarlos a mano.
3. Cargar identidad, conocimiento y catálogo.
4. Enviar un WhatsApp de prueba: respuesta del bot en <15s, visible en el panel de Conversaciones, con traza en la tab Trazas.

## 10. Post-deploy

- [ ] Rotar la `ANTHROPIC_API_KEY` temporal de las pruebas de dev.
- [ ] Verificar que el tunel/instancia de dev no comparte instancias Evolution con prod (1 bot = 1 instancia `bot-<botId>`; con DB separada no hay colisión).
- [ ] Activar proxy naranja en Cloudflare (opcional) con SSL Full (strict).
- [ ] Backup del Postgres `labs` (ya cubierto si el host tiene backups de Dokploy).

## Troubleshooting rápido

| Síntoma | Causa probable |
|---|---|
| Cert LetsEncrypt no emite | Proxy naranja activo antes de la emisión → poner DNS only y redeploy |
| 401 en webhooks de Evolution | `EVOLUTION_WEBHOOK_TOKEN` distinto entre env y la instancia creada — recrear conexión del bot |
| Bot no responde, conversación pasa a "Humano" | `ANTHROPIC_API_KEY` ausente/inválida — ver tab Trazas (error) |
| Fuentes de conocimiento en `failed` | `OPENAI_API_KEY` ausente — reintentar tras configurarla |
| `health` degraded | revisar el check en false (db/evolution/chatwoot) |
