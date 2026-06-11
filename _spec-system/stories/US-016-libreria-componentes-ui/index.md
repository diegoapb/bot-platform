---
id: US-016
title: Librería de componentes UI del design system
epic: E09
cycle: null
status: Levantamiento de requerimientos
priority: P0
estimate: L
owner: @diego
---

# US-016 · Librería de componentes UI del design system

**Como** desarrollador del frontend, **quiero** una librería de componentes reutilizables (Button, Card, Tag, Input, Eyebrow, StatTile, etc.) construida sobre los tokens del DS, **para** migrar las páginas sin reimplementar estilos ad-hoc en cada vista.

Depende de US-015 (tokens y Tailwind). Entrega `components/ui/` con variantes CVA fieles a los patrones del DS (botones pill con glow lime, cards light/dark, eyebrows mono, icon tiles).

## Documentos

- [Requerimientos](./requirements.md) — el **qué** (EARS).
- [Diseño](./design.md) — el **cómo** (arquitectura, contratos).
- [Tareas](./tasks.md) — el **en qué orden** (tareas + waves).
