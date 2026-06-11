---
id: US-016
---

# Tasks — US-016 · Librería de componentes UI

## Overview

Button (T1), Card y subcomponentes (T2), componentes de soporte (T3), formularios (T4), showcase y revisión (T5). T1–T4 paralelizables tras US-015; T5 cierra.

## Tasks

- [ ] **T1 — Button con variantes del DS**
  - Archivos: `apps/frontend/src/components/ui/button.tsx`
  - PASS si: primary/ghost-light/ghost-dark fieles al DS; pill; glow lime solo en primary; flecha animada opcional.
  - FAIL si: colores o sombras hardcodeadas fuera de tokens.
  - Requirements: 1.1, 1.2, 1.3

- [ ] **T2 — Card + subcomponentes (Eyebrow, IconTile, Title, Body, Tags)**
  - Archivos: `apps/frontend/src/components/ui/card.tsx`, `icon-tile.tsx`
  - PASS si: variantes light/dark; sombra solo en hover con lift; estructura interna del DS componible.
  - FAIL si: padding o radios fuera de la escala del DS.
  - Requirements: 2.1, 2.2, 2.3, 3.5

- [ ] **T3 — Tag, Badge, Eyebrow, StatTile**
  - Archivos: `apps/frontend/src/components/ui/tag.tsx`, `badge.tsx`, `eyebrow.tsx`, `stat-tile.tsx`
  - PASS si: mono Geist, squircle `--r-sm`, tonos correctos por superficie, separador dashed en StatTile.
  - FAIL si: el tono no cambia dentro de `.surface-dark`.
  - Requirements: 3.1, 3.3, 3.4

- [ ] **T4 — Input, Textarea, Select**
  - Archivos: `apps/frontend/src/components/ui/input.tsx`, `textarea.tsx`, `select.tsx`
  - PASS si: borde hairline, placeholder graphite-3, variante dark con backdrop blur; estados focus con lime accesible.
  - FAIL si: outline default del browser sin reemplazo accesible.
  - Requirements: 3.2

- [ ] **T5 — Showcase /dev/ui + revisión de fidelidad**
  - Archivos: `apps/frontend/src/pages/dev/UiShowcase.tsx`, `apps/frontend/src/App.tsx`
  - PASS si: todas las variantes visibles sobre light y dark; ruta excluida de producción; revisión side-by-side contra el DS aprobada.
  - FAIL si: la ruta aparece en build de producción.
  - Requirements: 4.1, 4.2, 4.3
