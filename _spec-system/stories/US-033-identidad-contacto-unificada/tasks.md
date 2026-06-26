---
id: US-033
---

# Tasks — US-033 · Identidad de contacto unificada entre canales

## Overview

Primero el modelo y la normalización (T1, T2), luego el resolver idempotente de contacto (T3) y su integración en el inbound (T4). Después se conmuta el pipeline de memoria a `contact_id` (T5) y se ejecuta el backfill idempotente (T6). Cierran los tests de unificación, aislamiento y migración (T7).

## Tasks

- [x] **T1 — Migración: tabla `contacts` + `contact_id` en links y memoria**
  - Archivos: `apps/backend/drizzle/0008_contacts.sql` (generado con `drizzle-kit generate`), `apps/backend/src/db/schema.ts`
  - PASS si: `pnpm db:migrate` aplica; `contacts` expone `id, tenant_id, agent_id, primary_identifier, display_name, created_at` con unique `(tenant_id, agent_id, primary_identifier)`; `channel_links`, `contact_memories`, `contact_facts`, `extracted_data` ganan `contact_id`; `contact_facts` queda con unique `(contact_id, key)`.
  - FAIL si: falta el índice único de `contacts` o algún nombre de tabla/columna diverge del data model.
  - Properties: P1, P3
  - Requirements: 5.1, 5.2

- [x] **T2 — `normalizeIdentifier`**
  - Archivos: `apps/backend/src/services/identifier.ts`, `apps/backend/src/services/identifier.test.ts`
  - PASS si: teléfono → E.164; email → minúsculas sin espacios; entradas no normalizables → `{ kind: "none", reliable: false }`; dos entradas equivalentes producen la misma forma canónica.
  - FAIL si: un email con mayúsculas o un teléfono con separadores genera identificadores distintos.
  - Properties: P2
  - Requirements: 1.1, 1.2, 1.3, 1.4

- [x] **T3 — `contactResolver`: resolución idempotente + unificación + sin-identificador**
  - Archivos: `apps/backend/src/services/contact.ts`
  - PASS si: `resolveContact` hace upsert `ON CONFLICT (tenant_id, agent_id, primary_identifier) DO NOTHING` + re-SELECT; asocia `channel_link` solo si `contact_id IS NULL`; links con identificador coincidente convergen al mismo contacto; sin identificador fiable usa `ensureLinkOwnContact` sin unificar.
  - FAIL si: dos llamadas concurrentes con el mismo identificador crean dos contactos, o un link sin identificador fiable se asocia a un contacto compartido.
  - Properties: P1, P2, P4, P5, P7
  - Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 6.1, 6.2

- [x] **T4 — Integrar resolución de contacto en `channel-inbound`**
  - Archivos: `apps/backend/src/services/channel-inbound.ts`
  - PASS si: tras crear/encontrar el `channel_link`, el inbound invoca el resolver y propaga `contactId` al resto del pipeline; inbound repetido por el mismo link conserva el contacto.
  - FAIL si: el pipeline sigue propagando solo `channelLinkId`, o un inbound reasigna el contacto de un link ya asociado.
  - Properties: P2, P7
  - Requirements: 2.4, 3.3

- [x] **T5 — Conmutar memoria/facts/extracción a `contact_id`**
  - Archivos: `apps/backend/src/services/context-builder.ts`, `apps/backend/src/services/memory.ts`, `apps/backend/src/services/extraction.ts`
  - PASS si: lectura y escritura de `contact_memories`/`contact_facts`/`extracted_data` operan por `contact_id` con filtro de `tenant_id`/`agent_id`; un valor vigente por clave por contacto; la nueva conversación de otro canal ve la memoria previa del contacto.
  - FAIL si: alguna query sigue anclando por `channel_link_id`, o se filtran datos de otro agente/tenant.
  - Properties: P3, P4
  - Requirements: 4.1, 4.2, 4.3, 4.4, 5.3, 6.3

- [x] **T6 — Backfill idempotente (1 contacto por `channel_link`)**
  - Archivos: `apps/backend/scripts/migrate-contacts.ts`
  - PASS si: cada `channel_link` queda con `contact_id`; memoria/facts/datos re-anclados sin pérdida ni duplicado; re-ejecutar el script no crea filas nuevas; fusión histórica por tel/email queda desactivada por defecto y documentada.
  - FAIL si: el conteo total de filas de memoria/facts/datos cambia tras el backfill, o re-ejecutarlo duplica contactos.
  - Properties: P2, P6
  - Requirements: 2.1, 3.2

- [ ] **T7 — Tests de unificación, aislamiento y migración**
  - Archivos: `apps/backend/test/contact-identity.test.ts`
  - PASS si: dos canales del mismo agente con el mismo teléfono → un contacto y memoria compartida; mismo teléfono en dos agentes → dos contactos; backfill conserva conteos; property-based de P1/P2/P4/P5 verde con identificadores generados.
  - FAIL si: algún test no es determinístico o llama a servicios externos reales.
  - Properties: P1, P2, P3, P4, P5, P6, P7
  - Requirements: 2.3, 3.1, 4.1, 4.4, 5.1, 5.2

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 1, "tasks": ["T1", "T2"] },
    { "id": 2, "tasks": ["T3"], "depends_on": [1] },
    { "id": 3, "tasks": ["T4", "T5"], "depends_on": [2] },
    { "id": 4, "tasks": ["T6"], "depends_on": [3] },
    { "id": 5, "tasks": ["T7"], "depends_on": [4] }
  ]
}
```

## Commits

- 2026-06-18 · E13 implementado (solo implementación; tests pendientes por decisión). Migraciones `0008_milky_magma.sql` (+enum whatsapp_evolution) y `0009_spicy_sharon_carter.sql` (DDL + backfill idempotente + NOT NULL), aplicadas y verificadas en dev. Typecheck monorepo OK.

## Research consultada

- `research/2026-06-18-desacople-agentes-canales.md` — decisión D6 (unificar contacto por identificador, memoria compartida entre canales del mismo agente) y riesgo Q4 (privacidad/colisiones/consentimiento en la fusión histórica) que fundamentan T1, T3 y T6.

## Notes

- Depende de la entidad `agents` (US-031): `contacts.agent_id` y el `agent_id` resuelto en el inbound deben existir antes de aplicar T1/T4. Si se ejecuta antes, apilar tras la migración de agentes.
- Supuesto: el teléfono ya viaja normalizable a E.164 desde Evolution/Chatwoot (reutiliza la normalización existente de `phone_rules`/`channel_links`).
- La retirada de la columna `channel_link_id` en memoria/facts/datos NO está en esta historia: se conserva durante la transición para rollback y se limpia en una historia posterior.
- La fusión histórica por tel/email en el backfill queda desactivada por defecto (1 contacto por link); habilitarla es una decisión operativa por los riesgos de colisión/consentimiento documentados.
