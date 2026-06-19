---
id: US-034
---

# Tasks — US-034 · UI de gestion de agentes

## Overview

Se construye de adentro hacia afuera: primero el cliente API y los tipos compartidos (T1), luego la lista y creacion de agentes (T2), despues el detalle con sus pestanas (T3), y en paralelo los paneles de identidad/modelo (T4), canales (T5) y conocimiento (T6); cierra el gating de permisos transversal y los tests del flujo (T7, T8). Toda la historia consume backend de US-030/031/032; no crea tablas ni endpoints.

## Tasks

- [ ] **T1 — Cliente API de agentes + tipos compartidos**
  - Archivos: `apps/frontend/src/lib/api.ts`, `packages/shared/src/index.ts`
  - PASS si: `useApi` expone `listAgents/getAgent/createAgent/updateAgent`, identidad de agente, `listAgentChannels/linkChannel/unlinkChannel` y `listAgentCollections/linkCollection/unlinkCollection`; los DTO de canal NO incluyen credenciales; tipos `AgentListItem`, `AgentChannel`, `KnowledgeCollection` exportados.
  - FAIL si: algun metodo proyecta `credentials` u otro secreto, o accede a recursos fuera del tenant del token.
  - Properties: P1, P2
  - Requirements: 1.1, 6.3, 6.5

- [ ] **T2 — `AgentsPage`: lista, estados y creacion**
  - Archivos: `apps/frontend/src/pages/agents/AgentsPage.tsx`
  - PASS si: lista muestra nombre, estado y nro de canales; loading/error con reintento; estado vacio; member ve solo asignados y sin formulario de crear; admin crea con nombre no vacio y el agente aparece tras confirmar.
  - FAIL si: el boton de crear aparece para member, o el envio se permite con nombre vacio.
  - Properties: P3
  - Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6

- [ ] **T3 — `AgentDetailPage`: carga, tabs y acceso**
  - Archivos: `apps/frontend/src/pages/agents/AgentDetailPage.tsx`, `apps/frontend/src/App.tsx`, `apps/frontend/src/components/Layout.tsx`
  - PASS si: rutas `/agents` y `/agents/:agentId` registradas + entrada de nav "Agentes"; detalle carga el agente y renderiza pestanas Identidad/Modelo/Canales/Conocimiento; member sin asignacion ve pantalla de acceso no permitido; navegacion lista→detalle funciona.
  - FAIL si: un member sin asignacion ve el contenido del detalle.
  - Properties: P1, P3
  - Requirements: 1.6, 6.1, 6.2, 6.4

- [ ] **T4 — Identidad reapuntada + `ModelSelector`**
  - Archivos: `apps/frontend/src/pages/agents/IdentityEditor.tsx`, `apps/frontend/src/pages/agents/ModelSelector.tsx`
  - PASS si: identidad muestra contenido vigente y version por tipo, guarda nueva version, lista historial con fecha/autor; selector alterna "global por defecto" (null) y modelo concreto y persiste; member en solo lectura; error conserva cambios pendientes.
  - FAIL si: member puede guardar identidad o cambiar modelo, o "global por defecto" no envia `model: null`.
  - Properties: P3, P4
  - Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7

- [ ] **T5 — `AgentChannelsPanel`: asignar/quitar canales**
  - Archivos: `apps/frontend/src/pages/agents/AgentChannelsPanel.tsx`
  - PASS si: muestra enlazados y disponibles con tipo y nombre visible (sin credenciales); enlaza/desenlaza con reflejo tras confirmar; canal tomado por otro agente se indica y no permite enlazar; error restaura estado previo; member en solo lectura.
  - FAIL si: se renderiza alguna credencial, o un canal ya enlazado a otro agente se puede enlazar.
  - Properties: P2, P4, P6
  - Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7

- [ ] **T6 — `AgentKnowledgePanel`: colecciones + conocimiento efectivo**
  - Archivos: `apps/frontend/src/pages/agents/AgentKnowledgePanel.tsx`
  - PASS si: muestra colecciones enlazadas y disponibles; enlaza/desenlaza con reflejo; conocimiento efectivo = colecciones enlazadas; vacio muestra aviso; error conserva estado previo; member en solo lectura.
  - FAIL si: el conjunto efectivo difiere de las colecciones enlazadas (omision o duplicado).
  - Properties: P4, P5
  - Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7

- [ ] **T7 — Gating de permisos y no-fuga de secretos transversal**
  - Archivos: `apps/frontend/src/pages/agents/AgentDetailPage.tsx`, `apps/frontend/src/pages/agents/AgentChannelsPanel.tsx`, `apps/frontend/src/pages/agents/AgentKnowledgePanel.tsx`
  - PASS si: con `orgRole == org:member` todos los controles de escritura estan ocultos o deshabilitados en lista, detalle y los tres paneles; ningun panel renderiza credenciales de canal.
  - FAIL si: cualquier control de escritura queda activo para member, o aparece un secreto en pantalla.
  - Properties: P2, P3
  - Requirements: 6.1, 6.2, 6.5

- [ ] **T8 — Tests de UI del flujo de agentes**
  - Archivos: `apps/frontend/test/agents.test.tsx`
  - PASS si: con cliente API mockeado pasan: lista→detalle→enlazar canal reflejado; enlazar coleccion y efectivo recalculado; member en solo lectura; mutacion fallida restaura estado previo; DTO de canal renderizado sin credenciales.
  - FAIL si: algun test depende del backend real o es no determinista.
  - Properties: P1, P2, P3, P4, P5, P6
  - Requirements: 1.1, 2.3, 4.2, 4.5, 5.2, 5.4, 6.2, 6.5

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 1, "tasks": ["T1"] },
    { "id": 2, "tasks": ["T2", "T3"], "depends_on": [1] },
    { "id": 3, "tasks": ["T4", "T5", "T6"], "depends_on": [2] },
    { "id": 4, "tasks": ["T7"], "depends_on": [3] },
    { "id": 5, "tasks": ["T8"], "depends_on": [4] }
  ]
}
```

## Commits

- _(pendiente)_

## Research consultada

- `research/2026-06-18-desacople-agentes-canales.md` — fundamenta el modelo agente/canal/conocimiento, las decisiones D2 (biblioteca de colecciones, referencia viva), D5 (identidad/prompt y modelo propios del agente) y la separacion de fases E13/E14 (UI de reglas/orquestador fuera de esta historia).

## Notes

- Depende de que US-030 (backend de agentes + identidad + modelo), US-031 (canales N:M / `agent_channels`) y US-032 (colecciones / `agent_knowledge_collections`) expongan los endpoints consumidos; si aun no existen, mockear el cliente para T2–T7 y cerrar contra los reales en T8.
- Fase 1 (E13): un canal se enlaza a exactamente un agente (unique en `channel_id`); la UI asume esa exclusividad (P6). En E14 se relajara.
- El modelo por agente (`agents.model`) asume que US-030 ya hizo configurable el modelo (Q3 del research); si se difiere, el `ModelSelector` muestra solo "global por defecto" en modo lectura.
- La UI no es frontera de seguridad: el aislamiento por tenant y la autorizacion los garantiza el backend; esta historia solo los refleja.
