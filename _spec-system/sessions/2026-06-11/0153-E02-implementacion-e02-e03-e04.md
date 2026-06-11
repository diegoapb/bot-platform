---
date: 2026-06-11
start: "01:53" # hora aproximada (hora de generación del reporte; inicio real algo antes)
end: "01:53"
epic: E02
stories: [US-005, US-006, US-007, US-008]
agent: claude-fable-5
participants: [@diego]
tags: [evolution-api, chatwoot, identidad, whatsapp, webhooks]
---

# Implementación de épicas E02, E03 y E04

## Resumen ejecutivo

- Se implementaron de punta a punta las épicas **E02 (Conexión WhatsApp vía Evolution)**, **E03 (Integración Chatwoot)** y **E04 (Identidad del agente)**: schema + migración, clientes de integración, servicios, rutas y UI.
- Todo el monorepo tipa limpio (`pnpm -r typecheck` en shared, backend y frontend).
- **Se probó desde la UI y todo funcionó correctamente**: vinculación por QR, provisión de Chatwoot y editor de identidad con versionado.
- Pendiente: tests automatizados (no existe harness de testing en el repo aún) y configurar `CHATWOOT_PLATFORM_TOKEN` real en producción.

## Contexto inicial

El usuario pidió: "realiza la implementación de las épicas E02, E03 y E04", partiendo de los specs ya redactados en `_spec-system/epics/` y `_spec-system/stories/` (US-005 a US-008).

## Épica y stories tocadas

- **Épicas**: E02 — Conexión WhatsApp vía Evolution API (dominante), E03 — Integración Chatwoot, E04 — Identidad del agente.
- **Stories**:
  - `US-005` — Registro y vinculación de número WhatsApp: implementada (T1–T5; T6 tests pendiente).
  - `US-006` — Provisión de cuenta e inbox Chatwoot por tenant: implementada.
  - `US-007` — Sincronización bidireccional de mensajes: implementada.
  - `US-008` — Gestión de identidad del agente: implementada.

## Decisiones tomadas

1. Nombre de instancia Evolution determinístico `bot-<botId>` — garantiza 1 bot = 1 instancia (P3) sin estado extra.
2. Webhook de Evolution protegido por header `x-webhook-token` global (`EVOLUTION_WEBHOOK_TOKEN`); el de Chatwoot por token por-bot en query string (`bots.chatwoot_webhook_token`), generado en la provisión.
3. Idempotencia de mensajes vía insert-first en `processed_messages` con unique `(bot_id, source, external_id)` como lock optimista.
4. Identidad append-only: `identity_documents` nunca se actualiza/borra; restore = nueva versión con contenido antiguo; retry sobre unique violation para guardados concurrentes.
5. `compileIdentity(botId)` se expone como función del servicio (import directo desde E06), no como endpoint HTTP.
6. Normalización del nombre de evento de Evolution (`CONNECTION_UPDATE` → `connection.update`) para tolerar diferencias entre versiones.
7. Rutas de identidad en router separado (`routes/identity.ts`) montado también en `/api/bots`.
8. El QR nunca se persiste (efímero, viene de Evolution en cada GET).

## Cambios en el repo

**Backend** (`apps/backend`):
- `src/db/schema.ts` — enums `connection_status`, `webhook_source`, `identity_type`; columnas `bots.connection_status/last_connected_at/chatwoot_inbox_identifier/chatwoot_webhook_token`, `tenants.chatwoot_account_id`; tablas `webhook_events`, `channel_links`, `processed_messages`, `identity_documents`.
- `drizzle/0002_shallow_manta.sql` — migración generada (aplicada).
- `src/env.ts` — nuevas vars: `EVOLUTION_WEBHOOK_TOKEN`, `PUBLIC_WEBHOOK_BASE_URL`, `CHATWOOT_PLATFORM_TOKEN` (+ `.env.example`).
- `src/integrations/evolution.ts` — cliente completo (createInstance con webhook, getQr, connectionState, logout, deleteInstance, sendText) y `EvolutionError`.
- `src/integrations/chatwoot.ts` — Platform API (cuentas, usuarios, attach) + Application API por cuenta (contactos, conversaciones, mensajes, inboxes).
- `src/services/chatwoot-provisioning.ts` — provisión idempotente cuenta→inbox + alta de agentes (nuevo).
- `src/services/message-sync.ts` — sync bidireccional con dedupe y mapeo `channel_links` (nuevo).
- `src/services/identity.ts` — getCurrent/save/listVersions/restore/compileIdentity (nuevo).
- `src/routes/bots.ts` — endpoints `POST/GET/DELETE /:id/connection`, `POST /:id/chatwoot/provision`, `GET /:id/chatwoot`, `POST /:id/chatwoot/agents`.
- `src/routes/webhooks.ts` — reescrito: `POST /webhooks/evolution/:instance` y `POST /webhooks/chatwoot/:botId`.
- `src/routes/identity.ts` — CRUD + historial + restore de documentos (nuevo).
- `src/index.ts` — montaje de `identityRoutes`.

**Shared** (`packages/shared`):
- `src/index.ts` — schemas `connectionStatus`, `botConnection`, `chatwootProvision`, `addChatwootAgent`, identidad (`IDENTITY_TYPES`, `saveIdentitySchema`, etc.); `botSchema` ampliado.
- `src/identity-templates.ts` — plantillas iniciales SOUL/IDENTITY/GUARDRAILS (nuevo).

**Frontend** (`apps/frontend`):
- `src/lib/api.ts` — métodos de conexión, Chatwoot e identidad.
- `src/pages/bots/BotDetailPage.tsx` — página de detalle con tabs WhatsApp/Chatwoot/Identidad (nuevo).
- `src/pages/bots/ConnectWhatsApp.tsx` — QR + polling 3s + timeout 5 min (nuevo).
- `src/pages/bots/ChatwootSettings.tsx` — provisión y alta de agentes (nuevo).
- `src/pages/bots/IdentityEditor.tsx` — editor con tabs, contador 20k, historial y restore (nuevo).
- `src/App.tsx`, `src/pages/BotsPage.tsx` — ruta `/bots/:botId` y enlace desde la lista.

Sin commits generados en esta sesión (cambios en working tree).

## Validación

- `pnpm -r typecheck` pasa en los 3 paquetes.
- **Pruebas manuales desde la UI: todo funcionó correctamente** (flujo de conexión WhatsApp, provisión Chatwoot y edición/versionado de identidad).

## Pendientes / próximos pasos

- [ ] Commit de los cambios de esta sesión.
- [ ] Tests de integración (T6 de US-005 y equivalentes) — montar harness vitest + msw.
- [ ] Configurar `CHATWOOT_PLATFORM_TOKEN` real y `PUBLIC_WEBHOOK_BASE_URL` pública (túnel en dev / Dokploy en prod).
- [ ] Marcar tasks completadas en los `tasks.md` de US-005..US-008 y actualizar dashboards.

## Bloqueos

Ninguno.

## Referencias

- Specs: `_spec-system/epics/E02..E04`, `_spec-system/stories/US-005..US-008`.
- **Conversación completa**: archivo hermano `*-RAW-*.md` que generará el hook `SessionEnd` al cerrar la sesión (mismo directorio).
