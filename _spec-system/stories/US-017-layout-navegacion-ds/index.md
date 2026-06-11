---
id: US-017
title: Layout global y navegación alineados al DS
epic: E09
cycle: null
status: Levantamiento de requerimientos
priority: P1
estimate: M
owner: @diego
---

# US-017 · Layout global y navegación alineados al DS

**Como** usuario del producto, **quiero** que el shell de la aplicación (header, navegación, rail de contenido, superficies) siga el Open Solvex Design System, **para** percibir una identidad visual consistente en cualquier página.

Depende de US-015 (tokens) y US-016 (componentes). Rediseña `Layout.tsx`: header sobre superficie forest con nav mono, org switcher y user button integrados, rail de contenido de 1240px con `--pad-x` fluido y alternancia de superficies.

## Documentos

- [Requerimientos](./requirements.md) — el **qué** (EARS).
- [Diseño](./design.md) — el **cómo** (arquitectura, contratos).
- [Tareas](./tasks.md) — el **en qué orden** (tareas + waves).
