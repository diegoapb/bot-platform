# E13 — Guía de pruebas (validar en dev)

Plan de pruebas **manuales** del desacople agente ↔ canal ↔ conocimiento + contacto
unificado (E13). No hay tests automatizados (se implementó "solo implementación"),
así que esta guía es la red de seguridad antes de subir a prod.

Va por capas: de lo más rápido (verificar datos) a lo más completo (conversación real).
Cada bloque indica qué infra necesita.

## 0. Preparación

```bash
# 1. Túnel a la DB de dev (déjalo abierto). Ver docs/GETTING-STARTED.md.
./scripts/dev-tunnel.sh

# 2. Backend + frontend
pnpm dev            # o pnpm dev:backend / pnpm dev:frontend
```

- Entra al frontend como **admin** del tenant. Para probar permisos, abre otra
  sesión (o navegador) como **member**.
- Token de Clerk para pegar como `Bearer` al probar la API a mano (consola del navegador):
  ```js
  await window.Clerk.session.getToken()
  ```
- SQL de verificación (la DB de dev ya está migrada):
  ```bash
  psql "$(grep ^DATABASE_URL apps/backend/.env | cut -d= -f2-)"
  ```

---

## 1. Smoke de migración (SQL · solo túnel · ~2 min)

```sql
-- Integridad del desacople: agentes migrados y cero huérfanos
SELECT (SELECT count(*) FROM bots)                                   AS bots,
       (SELECT count(*) FROM agents WHERE legacy_bot_id IS NOT NULL) AS agentes_migrados,
       (SELECT count(*) FROM identity_documents WHERE agent_id IS NULL) AS identity_huerfana,
       (SELECT count(*) FROM conversations WHERE agent_id IS NULL)      AS convos_sin_agente,
       (SELECT count(*) FROM channel_links WHERE contact_id IS NULL)    AS links_sin_contacto,
       (SELECT count(*) FROM knowledge_sources WHERE collection_id IS NULL) AS fuentes_sin_coll,
       (SELECT count(*) FROM knowledge_chunks  WHERE collection_id IS NULL) AS chunks_sin_coll;
-- esperado: agentes_migrados = bots; todos los "*_sin_*"/"huerfana" = 0

-- Invariante un-canal-un-agente (debe devolver 0 filas)
SELECT channel_id, count(*) FROM agent_channels GROUP BY channel_id HAVING count(*) > 1;

-- Canal legacy Evolution materializado + esquema de extracción copiado al agente
SELECT type, count(*) FROM channels GROUP BY type;            -- aparece whatsapp_evolution
SELECT name, (model IS NULL) AS usa_modelo_global, (extraction_schema IS NOT NULL) AS tiene_esquema FROM agents;
```

**Pasa si:** `agentes_migrados = bots`, todos los conteos de huérfanos `= 0`, no hay
canales con >1 agente.

---

## 2. UI de agentes (US-034 · backend + frontend)

En **/agents**. Cada fila: prueba como **admin** y confirma que como **member** es solo lectura.

| Qué | Pasos | Esperado |
|---|---|---|
| Lista + crear (R1, R2) | Crear agente "Test A" | Aparece con estado `draft` y 0 canales. Member: **no** ve el formulario de crear. |
| Identidad (R3) | Pestaña Identidad → editar SOUL → Guardar | Sube la versión; en "Historial" ves fecha/autor; "Restaurar" crea versión nueva. Member: textarea solo lectura. |
| Modelo (R3.4/3.5) | Pestaña Modelo → "Modelo concreto" `claude-haiku-4-5-20251001` → Guardar; luego "Global por defecto" | Persiste. SQL: `SELECT name, model FROM agents;` ("global" ⇒ `model` NULL). |
| Canales (R4) | Pestaña Canales → Enlazar disponible; luego Quitar | Se mueve entre listas. **Ningún panel muestra credenciales.** |
| Conocimiento (R5) | Pestaña Conocimiento → crear colección → Enlazar | "Conocimiento efectivo" = exactamente las enlazadas; vacío muestra aviso. |
| Acceso member (R6.4) | Como member, abrir `/agents/<id-no-asignado>` | "Acceso no permitido", no el detalle. |

---

## 3. Contratos / casos negativos (API o UI)

- **Canal ya tomado (409):** enlaza un canal al agente A; intenta enlazarlo a B → `409 channel_already_assigned`. En la UI ya no aparece como "disponible" para B.
- **Cross-tenant (404/403):** con el token del tenant 1, `GET /api/agents/<id-del-tenant-2>` → 404 (si tienes 2 tenants).
- **Gating de escritura:** con token **member**, `POST /api/agents` o `POST /api/agents/:id/channels` → 403.
- **Nombre vacío:** `POST /api/agents {"name":""}` → 422.

```bash
TOKEN="...(window.Clerk.session.getToken())"
curl -s localhost:3000/api/agents -H "Authorization: Bearer $TOKEN" | jq
```

---

## 4. End-to-end conversacional (Evolution + Chatwoot + Claude)

Prueban que el **pipeline opera por agente**. Lo más simple: enviar un WhatsApp al
número conectado del bot de dev.

**4a. Modelo efectivo (US-030)**
1. Fija `model = claude-haiku-4-5-20251001` en el agente.
2. Manda un mensaje → el bot responde.
3. `SELECT model, created_at FROM generations ORDER BY created_at DESC LIMIT 3;`
   → **pasa si** `model` = el del agente. Cambia a "global" y repite → registra `env.LLM_MODEL`.

**4b. Conocimiento por agente (US-032)**
1. Crea colección, agrega una fuente con un dato inventado ("El horario es 9 a 18"), enlázala al agente.
2. Pregunta por WhatsApp "¿cuál es el horario?" → responde con ese dato.
3. **Desenlaza** la colección y pregunta en una conversación nueva → ya no usa ese dato.

**4c. Multicanal, un solo cerebro (US-031)** *(requiere 2º canal, p.ej. Telegram)*
- Conecta Telegram y enlázalo al **mismo** agente que WhatsApp; escribe por ambos → misma identidad/modelo.

**4d. Contacto unificado (US-033)**
- En dev el backfill **no** fusiona por teléfono (1 contacto por link). La unificación real ocurre con links nuevos que normalicen al mismo E.164. Verifica:
  ```sql
  SELECT c.primary_identifier, count(cl.id) AS links
  FROM contacts c LEFT JOIN channel_links cl ON cl.contact_id=c.id
  GROUP BY c.id ORDER BY links DESC;
  ```
  `links > 1` = unificación; memoria/facts cuelgan de `contact_id` → se comparten.

**4e. Agente fijado en la conversación (decisión D3)**
1. Con una conversación viva, **reasigna** su canal a otro agente.
2. Otro mensaje en esa misma conversación → sigue el **agente original** (`conversations.agent_id` no cambia).
3. Una conversación **nueva** por ese canal usa el agente nuevo.

---

## 5. Regresión (que nada existente se rompió)

- El bot de WhatsApp existente sigue recibiendo y respondiendo (Evolution↔Chatwoot intacto).
- Handoff a humano, lista blanca/negra, catálogo, y la pestaña Contactos (memoria manual + datos extraídos) funcionan — ahora la extracción usa el esquema del **agente** y la memoria cuelga del **contacto**.

---

## Apéndice

- **Inbound sin teléfono real:** `POST /webhooks/evolution/<instancia>?token=<EVOLUTION_WEBHOOK_TOKEN>` con un payload `messages.upsert` (igual necesita Chatwoot arriba).
- **Limpieza:** borrar un agente cae en cascada sobre `agent_channels`, `agent_knowledge_collections`, `contacts`, identidad y conversaciones de ese agente.
