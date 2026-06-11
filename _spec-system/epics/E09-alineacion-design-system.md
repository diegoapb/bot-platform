---
id: E09
title: Alineación de la UI al Open Solvex Design System
status: draft
owner: @diego
---

## Objetivo

Que toda la UI del producto (frontend Vite + React + Tailwind) se vea y se sienta según el Open Solvex Design System (`_spec-system/knowledge-base/OpenSolvexDesignSystem`): paleta Forest/Lime/Beige/Graphite, tipografía Space Grotesk / DM Sans / Geist Mono, escala de spacing 4/8pt, sombras y animaciones definidas, y componentes reutilizables en lugar de estilos ad-hoc.

## Alcance

- Dentro:
  - Tokens del DS como CSS variables + mapeo a Tailwind theme.
  - Carga de las tres familias tipográficas.
  - Librería de componentes UI reutilizables (Button, Card, Tag/Badge, Input, Eyebrow, StatTile, etc.).
  - Rediseño del layout global (header/nav, rail de contenido 1240px, superficies light/dark).
  - Migración de todas las páginas y sub-vistas existentes a los nuevos tokens y componentes.
- Fuera:
  - Cambios funcionales o de backend (solo presentación).
  - Nuevas páginas o features.
  - Landing/marketing site.
  - Theming por tenant.

## Criterios de salida

- [ ] Ningún color/tipografía/sombra hardcodeada fuera de los tokens del DS en `apps/frontend`.
- [ ] Las tres fuentes del DS cargadas y aplicadas (display, body, mono).
- [ ] Componentes UI base con variantes documentadas y usados por todas las páginas.
- [ ] Todas las páginas (`/`, `/bots/:id` y sus 8 tabs, `/conversations`, `/metrics`, `/team`, `/admin`) migradas visualmente.
- [ ] Revisión visual side-by-side contra el DS sin desviaciones de paleta, tipografía ni spacing.
