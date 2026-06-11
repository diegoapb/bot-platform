---
id: US-013
title: Memoria persistente por cliente
epic: E07
cycle: C01
status: Pendiente desarrollo
priority: P1
estimate: M
owner: @diego
---

# US-013 · Memoria persistente por cliente

**Como** cliente final recurrente, **quiero** que el bot recuerde quién soy y qué hemos hablado, **para** no repetir mi contexto en cada conversación.

Perfil por contacto (hechos clave-valor + resumen incremental del historial) que el motor consulta al construir contexto y actualiza al cerrar conversaciones. Visible y editable en el dashboard.

## Documentos

- [Requerimientos](./requirements.md) — el **qué** (EARS).
- [Diseño](./design.md) — el **cómo** (arquitectura, contratos, propiedades).
- [Tareas](./tasks.md) — el **en qué orden** (tareas + grafo de waves).
