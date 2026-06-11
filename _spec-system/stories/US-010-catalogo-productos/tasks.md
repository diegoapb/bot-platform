---
id: US-010
---

# Tasks — US-010 · Catálogo de productos y servicios

## Overview

Modelo con tsvector (T1), servicio (T2), import CSV (T3), rutas (T4), UI (T5), tests (T6).

## Tasks

- [x] **T1 — Migración: `catalog_items` con tsvector generado**
  - Archivos: `apps/backend/drizzle/000X_catalog.sql`, `apps/backend/src/db/schema.ts`
  - PASS si: columna generada con config `spanish`; índice GIN; numeric(12,2); enums correctos.
  - FAIL si: precio como float/double.
  - Properties: P3
  - Requirements: 1.1

- [x] **T2 — `catalogService` CRUD + `searchCatalog`**
  - Archivos: `apps/backend/src/services/catalog.ts`
  - PASS si: create/update/archive correctos; search solo activos del bot con ranking.
  - FAIL si: ítem archivado aparece en searchCatalog.
  - Properties: P1, P2, P3
  - Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3

- [x] **T3 — Import CSV con reporte por fila**
  - Archivos: `apps/backend/src/services/catalog.ts`
  - PASS si: 500 filas máx; válidas insertadas, inválidas reportadas con fila y motivo.
  - FAIL si: una fila inválida aborta todo el import.
  - Properties: P4
  - Requirements: 1.5

- [x] **T4 — Rutas `/api/bots/:id/catalog*`**
  - Archivos: `apps/backend/src/routes/catalog.ts`, `apps/backend/src/index.ts`
  - PASS si: admin escribe, member solo GET; filtros q/availability; multipart import.
  - FAIL si: acceso cross-tenant.
  - Properties: P1
  - Requirements: 3.1, 3.2

- [x] **T5 — UI `CatalogManager`**
  - Archivos: `apps/frontend/src/pages/bots/CatalogManager.tsx`
  - PASS si: tabla con filtros, modal CRUD, archivar con confirmación, import con reporte visible.
  - FAIL si: precios renderizados con errores de redondeo.
  - Properties: P3
  - Requirements: 1.1, 1.5, 3.1

- [ ] **T6 — Tests de catálogo**
  - Archivos: `apps/backend/test/catalog.test.ts`
  - PASS si: property test de import (P4), aislamiento, archivado, búsqueda en español (acentos/plurales).
  - FAIL si: tests no determinísticos.
  - Properties: P1, P2, P3, P4
  - Requirements: 1.3, 1.5, 2.1, 2.2

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 1, "tasks": ["T1"] },
    { "id": 2, "tasks": ["T2", "T3"], "depends_on": [1] },
    { "id": 3, "tasks": ["T4"], "depends_on": [2] },
    { "id": 4, "tasks": ["T5", "T6"], "depends_on": [3] }
  ]
}
```

## Commits

_(SHAs al ejecutar)_

## Research consultada

- _(n/a — patrón estándar full-text Postgres)_

## Notes

- El motor decide cuándo consultar catálogo vs conocimiento (US-011, tool-use).
- Sincronización con e-commerce externos queda explícitamente fuera (ver épica E05).
