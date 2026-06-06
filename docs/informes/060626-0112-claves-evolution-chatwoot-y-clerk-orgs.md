# Informe de avance — Claves de Evolution / Chatwoot extraídas y Clerk Organizations activado

**Proyecto:** bot-plataform · **Sección:** cierre de pendientes del entorno local (integraciones externas)
**Estado:** ✅ `EVOLUTION_API_KEY`, `CHATWOOT_API_TOKEN` y `CHATWOOT_ACCOUNT_ID` resueltos en `apps/backend/.env` · ✅ Clerk Organizations activado (confirmado por el USER)
**Stack afectado:** backend (env vars de integraciones)
**Continúa a:** [`060626-0041-entorno-dev-local-db-env.md`](./060626-0041-entorno-dev-local-db-env.md)

---

## 1. Resumen ejecutivo

Se cerraron los **tres pendientes** que dejaba el informe anterior: las dos claves de integración (Evolution y Chatwoot) que estaban como `CHANGE_ME` en `apps/backend/.env`, y la habilitación de **Organizations** en Clerk.

Las dos claves se **extrajeron por SSH al host de Dokploy** (alias `dokploy`, usuario `woofly`) directamente de los contenedores en ejecución — sin pasar por la UI de Dokploy ni por la de Chatwoot — y se verificaron con un `curl` contra el endpoint público antes de escribirlas en el `.env`.

Con esto el backend ya cubre todas las variables que `apps/backend/src/env.ts` declara como requeridas y las integraciones (`evolution.ts`, `chatwoot.ts`) pueden hacer llamadas reales.

---

## 2. Qué se hizo (procedimiento)

### 2.1. `EVOLUTION_API_KEY` — vía env del contenedor

Evolution expone su apikey global en una env var del propio compose. Se localizó el contenedor y se leyó:

```bash
ssh dokploy "docker ps --format '{{.Names}}\t{{.Image}}' | grep -i evolution"
# → compose-generate-redundant-feed-79kq1j-evolution-api-1  evoapicloud/evolution-api:latest

ssh dokploy "docker exec compose-generate-redundant-feed-79kq1j-evolution-api-1 \
  sh -c 'echo \$AUTHENTICATION_API_KEY'"
# → gYrTjI...ZnEnw==  (valor escrito en .env, no se reproduce aquí)
```

**Verificación:**
```bash
curl -s -o /dev/null -w "HTTP %{http_code}\n" \
  -H "apikey: $EVOLUTION_API_KEY" \
  https://evolutionapi.diegop.com/instance/fetchInstances
# → HTTP 200
```

### 2.2. `CHATWOOT_API_TOKEN` — vía DB de Chatwoot

A diferencia de Evolution, el token de Chatwoot **no está en una env var**: es un *User Access Token* por usuario, guardado en la tabla `access_tokens` del Postgres de Chatwoot. Se consultó la DB desde el propio contenedor Rails (que ya tiene credenciales y conectividad al Postgres compartido `labs-vector-uvatca`):

```bash
ssh dokploy "docker exec chatwoot-app-onv8he-fpazmr-chatwoot-rails-1 sh -c '
  PGPASSWORD=*** psql -h labs-vector-uvatca -U chatwoot -d chatwoot -t -c
    \"SELECT u.id, u.email, u.name, at.token
      FROM users u
      JOIN access_tokens at ON at.owner_id = u.id AND at.owner_type = '\''User'\''
      JOIN account_users au ON au.user_id = u.id
      WHERE au.role = 1
      ORDER BY u.id LIMIT 10;\"'"
# → 1 | dap465@hotmail.com | Diego | mLAa...xcaYY
```

Se eligió el token del usuario **admin** (`role = 1` = Administrator) propietario de la cuenta principal.

`CHATWOOT_ACCOUNT_ID` se confirmó interrogando la tabla `accounts`:

```sql
SELECT id, name FROM accounts ORDER BY id;
-- → 1 | SMM   (única cuenta)
```

Por lo tanto `CHATWOOT_ACCOUNT_ID=1` (ya estaba puesto a `1` por defecto, se confirma correcto).

**Verificación:**
```bash
curl -s -o /dev/null -w "HTTP %{http_code}\n" \
  -H "api_access_token: $CHATWOOT_API_TOKEN" \
  https://chatwoot.diegop.com/api/v1/accounts/1/inboxes
# → HTTP 200
```

### 2.3. Clerk Organizations

El USER activó **Organizations** desde el dashboard de Clerk (*Configure → Organizations → Enable*). Sin esto, el alta de tenants (multitenancy) no funcionaba; ahora queda desbloqueada.

---

## 3. Cambios en el repo

| Archivo | Cambio |
|---|---|
| `apps/backend/.env` | `EVOLUTION_API_KEY`: `CHANGE_ME` → valor real. **No versionado.** |
| `apps/backend/.env` | `CHATWOOT_API_TOKEN`: `CHANGE_ME` → valor real. **No versionado.** |
| `apps/backend/.env` | `CHATWOOT_ACCOUNT_ID=1` confirmado (ya estaba). |
| Clerk (dashboard) | Organizations habilitado (paso manual del USER, fuera del repo). |

> No se hizo ningún commit. No hay archivos versionados modificados.

---

## 4. Estado final de variables (backend)

Todas las variables declaradas en [`apps/backend/src/env.ts`](../../apps/backend/src/env.ts) están **resueltas** salvo `REDIS_URL` (opcional, comentado a propósito).

| Variable | Estado | Origen |
|---|---|---|
| `DATABASE_URL` | ✅ | recurso Dokploy `botplatform-dev` vía túnel SSH |
| `CLERK_SECRET_KEY` / `CLERK_PUBLISHABLE_KEY` | ✅ | instancia de dev de Clerk |
| `SUPERADMIN_USER_IDS` | ✅ | user id del USER en Clerk |
| `EVOLUTION_API_URL` | ✅ | URL pública (`evolutionapi.diegop.com`) |
| `EVOLUTION_API_KEY` | ✅ **nuevo** | env `AUTHENTICATION_API_KEY` del contenedor Evolution |
| `CHATWOOT_API_URL` | ✅ | URL pública (`chatwoot.diegop.com`) |
| `CHATWOOT_API_TOKEN` | ✅ **nuevo** | DB Chatwoot, `access_tokens` del admin (account "SMM") |
| `CHATWOOT_ACCOUNT_ID` | ✅ | `1` (única cuenta) |
| `WEBHOOK_SECRET` | ✅ | generado en local |
| `REDIS_URL` | ⏸️ opcional, comentado | — |

---

## 5. Pendientes

Ninguno del bloque "entorno local + integraciones externas". Quedan los **opcionales** ya listados en el informe anterior:

- Webhooks entrantes en local (`cloudflared`/ngrok) si se quiere recibir mensajes reales en dev.
- Habilitar `REDIS_URL` si alguna feature lo requiere.

---

## 6. Notas de seguridad

- Las claves quedan **solo** en `apps/backend/.env` (gitignored). No se versionan, no se imprimen en este informe ni en commits.
- El acceso por SSH a Dokploy se hizo con la identidad del USER (`~/.ssh/dokploy_ed25519`, alias `dokploy`, user `woofly`) — operación de solo lectura sobre infraestructura propia.
- El token de Chatwoot extraído es el del usuario **admin existente** del USER; no se creó ningún usuario ni token nuevos. Si en el futuro se quiere un token dedicado al bot, lo recomendable es crear un usuario "bot" con rol Administrator y usar *su* access token (revocable de forma independiente).
