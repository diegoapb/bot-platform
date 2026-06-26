# E13 — Runbook de salida a producción

Cómo subir el desacople agente ↔ canal ↔ conocimiento (E13) a prod **sin perder datos**.
Complementa `docs/DEPLOY-PROD.md` e `infra/dokploy/README.md` (infra general). Aquí
solo lo específico de esta release: una **migración con backfill** + el orden correcto
de despliegue.

> ⚠️ E13 NO es aditivo puro. La migración `0009` elimina FKs de `bot_id`, vuelve
> columnas nullable, hace `SET NOT NULL` tras backfill y cambia uniques. **Backup
> obligatorio antes de migrar.**

## Qué cambia en prod

- Migraciones nuevas: `0008_milky_magma.sql` (añade el valor de enum
  `whatsapp_evolution`) y `0009_spicy_sharon_carter.sql` (DDL + backfill idempotente
  + `NOT NULL` + uniques). **Deben aplicarse en ese orden** — `0008` commitea el
  valor de enum antes de que `0009` lo use (PostgreSQL no permite usar un valor de
  enum nuevo en la misma transacción donde se añade).
- Código nuevo: requiere el esquema nuevo (`agents`, `conversations.agent_id NOT NULL`,
  etc.). El código viejo **no** sabe poblar `agent_id`/`contact_id` → ver "Orden de despliegue".
- Webhooks: **sin cambios** (siguen por instancia/bot). No hay que reconfigurar nada.
- Comportamiento: el backfill crea **1 contacto por channel_link** (sin fusión
  histórica por teléfono/email — decisión de diseño por riesgo de colisión/consentimiento).

## Pre-flight

- [ ] `0008` y `0009` (+ `meta/`) están en `main` y el deploy de Dokploy apunta a `main`.
- [ ] `pnpm -r typecheck` limpio; `pnpm --filter @bot/backend db:generate` dice "No schema changes" (esquema y snapshots en sync).
- [ ] Probado en dev con `docs/E13-testing.md` (al menos §1 smoke + §4a/§4b E2E).
- [ ] Acordada una **ventana de bajo tráfico** (la migración toma locks de tabla y hay un breve gap esquema↔código).

## Pasos

### 1. Túnel a la DB de prod

Mismo `labs-vector` que dev, pero **otra base** (`botplatform`, no `botplatform_dev`):

```bash
./scripts/dev-tunnel.sh           # localhost:5432 -> labs-vector
# DATABASE_URL de prod = postgresql://botplatform:<pass>@localhost:5432/botplatform
```

### 2. Backup (obligatorio, antes de tocar nada)

```bash
PGURL="postgresql://botplatform:<pass>@localhost:5432/botplatform"
pg_dump "$PGURL" -Fc -f e13-prebackfill-$(date +%Y%m%d-%H%M).dump
```

> Si algo sale mal, este dump es el plan de rollback real (la migración altera el
> esquema; revertir = restaurar este dump).

### 3. Pausar los bots (recomendado)

Para evitar que el código viejo intente crear conversaciones contra el esquema nuevo
durante el gap, pausa los bots desde el panel (o `UPDATE bots SET status='paused'`)
antes de migrar, y reactívalos al final. En un prod muy pequeño puedes omitirlo y
asumir que algún mensaje entrante durante el gap se reintenta.

### 4. Aplicar la migración

```bash
cd apps/backend
DATABASE_URL="$PGURL" pnpm db:migrate     # aplica 0008 y luego 0009
```

`0009` corre en una sola transacción (DDL → backfill → NOT NULL → uniques): si falla,
hace rollback completo. El backfill es **idempotente** (re-ejecutar `db:migrate` no
duplica nada).

### 5. Verificar el backfill (mismas queries que dev)

```sql
SELECT (SELECT count(*) FROM bots)                                   AS bots,
       (SELECT count(*) FROM agents WHERE legacy_bot_id IS NOT NULL) AS agentes_migrados,
       (SELECT count(*) FROM identity_documents WHERE agent_id IS NULL) AS identity_huerfana,
       (SELECT count(*) FROM conversations  WHERE agent_id IS NULL)     AS convos_sin_agente,
       (SELECT count(*) FROM channel_links  WHERE contact_id IS NULL)   AS links_sin_contacto,
       (SELECT count(*) FROM knowledge_sources WHERE collection_id IS NULL) AS fuentes_sin_coll,
       (SELECT count(*) FROM knowledge_chunks  WHERE collection_id IS NULL) AS chunks_sin_coll;
-- agentes_migrados = bots; el resto = 0
SELECT channel_id, count(*) FROM agent_channels GROUP BY channel_id HAVING count(*) > 1;  -- 0 filas
```

**No continúes** si algún huérfano ≠ 0 o aparecen canales con >1 agente: restaura el
backup y revisa.

### 6. Desplegar el código nuevo

```bash
# auto-deploy on push a main, o manual:
python3 <skill>/dokploy_client.py POST /compose.deploy composeId=<COMPOSE_ID>
python3 <skill>/tail_deployment.py --compose-id <COMPOSE_ID> --watch
```

Espera a que `backend` quede healthy (`/health/live`).

### 7. Reactivar bots y smoke

```bash
node scripts/smoke-prod.mjs --backend https://api.sira.opensolvex.co --frontend https://sira.opensolvex.co
```

- Reactiva los bots pausados en §3.
- En el panel: `/agents` lista los agentes migrados; abre uno y revisa Identidad/Modelo/Canales/Conocimiento.
- Manda un WhatsApp de prueba → respuesta <15s y traza en Trazas con el `model` correcto.

## Orden de despliegue (por qué importa)

El esquema nuevo pone `conversations.agent_id NOT NULL`; el código viejo inserta
conversaciones sin `agent_id`. Por eso: **migrar → desplegar** en la misma ventana.
- Conversaciones existentes: el código viejo solo hace `ensureConversation` con
  `onConflictDoNothing` → para las que ya existen es no-op, no rompe.
- El único caso frágil es un cliente **nuevo** escribiendo en el gap esquema↔código:
  ese insert fallaría hasta que entre el código nuevo (Evolution reintenta). Pausar
  los bots (§3) lo elimina.

## Rollback

| Situación | Acción |
|---|---|
| Falla en `0009` | La transacción ya hizo rollback sola; el esquema queda como antes. Revisa el error y reintenta. |
| Migración OK pero el código nuevo falla en prod | Redeploy de la imagen anterior **no es seguro** (no maneja `agent_id NOT NULL`): restaura el backup del §2 y redeploya la imagen anterior. |
| Datos inconsistentes detectados en §5 | Restaura el backup del §2. |

## Post-deploy

- [ ] Verifica que cada bot tiene su canal `whatsapp_evolution` y su agente:
      `SELECT type, count(*) FROM channels GROUP BY type;`
- [ ] Confirma que el `extraction_schema` se copió al agente (los bots que lo tenían):
      `SELECT name, (extraction_schema IS NOT NULL) FROM agents;`
- [ ] Borra el dump de backup cuando estés seguro (o muévelo a almacenamiento seguro).
- [ ] Las columnas legacy (`identity_documents.bot_id`, `knowledge_*.bot_id`,
      `contact_*.channel_link_id`) se **conservan** para rollback; su retiro es una
      historia posterior, no en esta release.

## E14 (siguiente)

Las tablas N:M (`agent_channels`, `agent_knowledge_collections`) ya quedan listas para
el ruteo multi-agente por canal de E14; el `unique(channel_id)` se relajará allí.
