---
id: US-007
---

# Tasks — US-007 · Sincronización bidireccional de mensajes

## Overview

Modelo de mapeo/dedup primero (T1), extensiones de clientes (T2), servicio de sync con inbound (T3) y reply (T4), webhook Chatwoot (T5), integración (T6).

## Tasks

- [ ] **T1 — Migración: `channel_links` y `processed_messages`**
  - Archivos: `apps/backend/drizzle/000X_message_sync.sql`, `apps/backend/src/db/schema.ts`
  - PASS si: uniques `(bot_id, wa_jid)` y `(bot_id, source, external_id)` activos; índices por tenant.
  - FAIL si: inserción duplicada no falla a nivel DB.
  - Properties: P1, P3
  - Requirements: 1.4, 3.1, 3.3

- [ ] **T2 — Extensiones de `ChatwootClient` y `EvolutionClient`**
  - Archivos: `apps/backend/src/integrations/chatwoot.ts`, `apps/backend/src/integrations/evolution.ts`
  - PASS si: searchContact/createContact/createConversation/createMessage y sendText operativos en dev.
  - FAIL si: llamadas sin `account_id` del tenant.
  - Properties: P4
  - Requirements: 1.2, 1.3, 2.1

- [ ] **T3 — `messageSync.handleInbound`**
  - Archivos: `apps/backend/src/services/message-sync.ts`, `apps/backend/src/routes/webhooks.ts`
  - PASS si: nuevo contacto → contacto+conversación+mensaje; contacto conocido → solo mensaje; duplicado → no-op; grupo/fromMe → descartado; no-texto → nota de tipo.
  - FAIL si: reintento crea segundo mensaje en Chatwoot.
  - Properties: P1, P2, P3, P4
  - Requirements: 1.1, 1.2, 1.3, 1.4, 4.1, 4.2

- [ ] **T4 — `messageSync.handleAgentReply`**
  - Archivos: `apps/backend/src/services/message-sync.ts`
  - PASS si: outgoing no-privado → sendText; privado/incoming → ignorado; fallo Evolution → nota privada.
  - FAIL si: el eco fromMe del envío genera mensaje nuevo.
  - Properties: P2
  - Requirements: 2.1, 2.2, 2.3

- [ ] **T5 — Webhook `POST /api/webhooks/chatwoot/:botId` con token**
  - Archivos: `apps/backend/src/routes/webhooks.ts`, `apps/backend/src/services/chatwoot-provisioning.ts`
  - PASS si: token inválido → 401; el webhook se registra en el inbox al provisionar (US-006).
  - FAIL si: webhook acepta eventos sin token.
  - Properties: P4
  - Requirements: 2.1

- [ ] **T6 — Tests de integración del flujo bidireccional**
  - Archivos: `apps/backend/test/message-sync.test.ts`
  - PASS si: ciclo completo inbound→reply→eco cubierto; reintentos concurrentes → 1 solo mensaje.
  - FAIL si: tests no determinísticos.
  - Properties: P1, P2, P3
  - Requirements: 1.1, 1.4, 2.1, 2.3

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 1, "tasks": ["T1", "T2"] },
    { "id": 2, "tasks": ["T3", "T4"], "depends_on": [1] },
    { "id": 3, "tasks": ["T5"], "depends_on": [2] },
    { "id": 4, "tasks": ["T6"], "depends_on": [3] }
  ]
}
```

## Commits

_(SHAs al ejecutar)_

## Research consultada

- _(pendiente: payloads `messages.upsert` Evolution v2 y webhooks de Chatwoot)_

## Notes

- Depende de US-005 (webhook Evolution) y US-006 (inbox + account ids).
- Multimedia completo queda para post-MVP (solo nota de tipo, 4.1).
