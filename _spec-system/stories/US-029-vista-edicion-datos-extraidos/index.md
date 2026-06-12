---
id: US-029
title: Vista amigable y edición JSON de los datos extraídos
epic: E12
cycle: null
status: Pendiente de pruebas
priority: P1
estimate: M
owner: @diego
---

# US-029 · Vista amigable y edición JSON de los datos extraídos

**Como** admin de tenant, **quiero** ver la información extraída de cada cliente de forma legible y poder corregirla editando el JSON, **para** confiar en los datos y ajustarlos cuando el bot se equivoque.

Vista en el dashboard que renderiza los campos extraídos de forma amigable (etiquetas, tipos, vacíos visibles) con un editor JSON validado contra el esquema de US-027; las ediciones quedan marcadas como manuales para que la extracción automática (US-028) no las sobrescriba. Alineada al design system (E09).

## Documentos

- [Requerimientos](./requirements.md) — el **qué** (EARS).
- [Diseño](./design.md) — el **cómo** (arquitectura, contratos, propiedades).
- [Tareas](./tasks.md) — el **en qué orden** (tareas + grafo de waves).
