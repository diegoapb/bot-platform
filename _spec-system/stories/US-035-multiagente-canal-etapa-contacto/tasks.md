---
id: US-035
---

# Tasks — US-035 · Multiples agentes por canal y etapa del contacto

## Overview

Primero el modelo de datos (T1: relajar `agent_channels`, `channels.default_agent_id`, etapa en `contacts`, tabla de auditoría). Luego los servicios de dominio (T2 candidatos+default, T3 etapa+auditoría) que codifican las invariantes. Sobre ellos, las rutas Hono (T4) y el mapeo+consumidor de label de Chatwoot (T5). Cierra con tests que verifican las propiedades P1–P6 de extremo a extremo (T6). No hay UI ni ruteo: ambos son historias posteriores de E14.

## Tasks

- [ ] **T1 — Migración: N:M canal-agente, default del canal, etapa del contacto y auditoría**
  - Archivos: `apps/backend/drizzle/00XX_e14_multiagent_stage.sql`, `apps/backend/src/db/schema.ts`
  - PASS si: se elimina el `unique(channel_id)` de `agent_channels` y queda `unique(agent_id, channel_id)`; `channels.default_agent_id` (uuid null fk agents set null) existe; enums `contact_stage` y `stage_source` creados; `contacts` gana `stage`, `stage_source` (default `manual`), `stage_updated_at`; tabla `contact_stage_transitions` con índice `(contact_id, created_at)`; los enlaces 1:1 previos de E13 siguen válidos tras migrar.
  - FAIL si: nombres/tipos divergen del data model del diseño, o un canal deja de poder tener varios agentes.
  - Properties: P1, P3, P5
  - Requirements: 1.2, 2.1, 3.1, 4.1

- [ ] **T2 — `agentChannelsService`: candidatos + agente por defecto**
  - Archivos: `apps/backend/src/services/agent-channels.ts`
  - PASS si: `addCandidate` inserta y rechaza duplicado (409) y cross-tenant (403); `removeCandidate` borra solo ese par y bloquea si es el default; `setDefault` solo acepta candidatos del canal; `getDefault`/`listCandidates` devuelven solo datos del tenant.
  - FAIL si: se puede fijar un default que no es candidato, o quitar el candidato que es el default.
  - Properties: P1, P2, P3
  - Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.1, 2.2, 2.3, 2.4, 2.5

- [ ] **T3 — `contactStageService`: lectura/escritura de etapa + auditoría**
  - Archivos: `apps/backend/src/services/contact-stage.ts`
  - PASS si: `setStageManual` valida valores (422), aplica no-op al mismo valor sin transición, registra transición con actor en cambio real; `syncStageFromLabel` respeta precedencia manual e idempotencia; `getStage`/`listTransitions` aíslan por tenant y devuelven historial desc.
  - FAIL si: una sincronización pisa una etapa manual, o un cambio efectivo no deja transición.
  - Properties: P2, P4, P5, P6
  - Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 5.3, 5.5

- [ ] **T4 — Rutas Hono: candidatos, default y etapa**
  - Archivos: `apps/backend/src/routes/channel-agents.ts`, `apps/backend/src/routes/contact-stage.ts`, `apps/backend/src/index.ts`
  - PASS si: `POST/GET/DELETE /api/channels/:id/agents`, `PUT/GET /api/channels/:id/default-agent`, `PUT/GET /api/contacts/:id/stage`, `GET /api/contacts/:id/stage/history` responden con los códigos del diseño; solo admin escribe; cross-tenant → 403.
  - FAIL si: un member escribe, o una ruta devuelve datos de otro tenant.
  - Properties: P2, P3
  - Requirements: 1.1, 1.5, 1.6, 2.1, 2.5, 3.1, 3.2, 4.4

- [ ] **T5 — `stageLabelMap` + consumidor de label en webhook de Chatwoot**
  - Archivos: `apps/backend/src/services/stage-label-map.ts`, `apps/backend/src/routes/webhooks.ts`
  - PASS si: `mapLabelsToStage` devuelve la etapa mapeada o null; el consumidor resuelve el contacto por `channel_links` y delega en `syncStageFromLabel`; label sin mapeo ignorado; contacto inexistente ignorado.
  - FAIL si: un label no mapeado altera la etapa, o un evento crea contacto/etapa de la nada.
  - Properties: P4, P6
  - Requirements: 5.1, 5.2, 5.4

- [ ] **T6 — Tests de N:M, invariante del default, etapa y sincronización**
  - Archivos: `apps/backend/test/agent-channels.test.ts`, `apps/backend/test/contact-stage.test.ts`
  - PASS si: dos agentes en un canal sin duplicar par; default no-candidato rechazado; aislamiento cross-tenant; intercalado manual/label conserva precedencia e idempotencia; nº de transiciones == nº de cambios efectivos; historial desc.
  - FAIL si: algún test no es determinístico o llama a Chatwoot real (el evento de label se simula).
  - Properties: P1, P2, P3, P4, P5, P6
  - Requirements: 1.2, 1.3, 2.2, 2.4, 3.5, 4.1, 5.3, 5.5

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 1, "tasks": ["T1"] },
    { "id": 2, "tasks": ["T2", "T3"], "depends_on": [1] },
    { "id": 3, "tasks": ["T4", "T5"], "depends_on": [2] },
    { "id": 4, "tasks": ["T6"], "depends_on": [3] }
  ]
}
```

## Commits

_(pendiente)_

## Research consultada

- `research/2026-06-18-desacople-agentes-canales.md` — fundamentó el modelo N:M canal↔agente (sección 5, `agentChannels`), la fase E14 multi-agente por canal (sección 6) y la pregunta abierta Q6 sobre el origen de la etapa del cliente (manual / label de Chatwoot / fact / CRM), resuelta en esta historia como manual + label, con derivado de facts opcional y CRM externo fuera.

## Notes

- Depende de E13: `agents`, `channels`, `agent_channels` (con `unique(channel_id)`) y `contacts` deben existir antes de T1.
- Q6 (origen de la etapa) se decide aquí: set manual + sincronización desde label de Chatwoot; derivado de facts opcional (no implementado en esta historia); CRM externo fuera de alcance.
- El motor de reglas (US-036), el orquestador (US-037), la resolución/fijación del agente en `conversations.agent_id` (US-038) y la UI (US-039) consumirán estos datos pero no se construyen aquí.
- La normalización del transporte legacy WhatsApp/Evolution como canal es propiedad de US-031; aquí se asume `channels` como única fuente del enlace canal↔agente.
