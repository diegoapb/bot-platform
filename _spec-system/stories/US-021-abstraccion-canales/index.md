---
id: US-021
title: Abstracción de canal y provisión de inbox por canal
epic: E11
cycle: null
status: Pendiente de pruebas
priority: P0
estimate: M
owner: @diego
---

# US-021 · Abstracción de canal y provisión de inbox por canal

**Como** plataforma, **quiero** una entidad `Channel` por bot (tipo, credenciales, estado, inbox de Chatwoot asociado), **para** que todos los canales se gestionen con el mismo modelo y cada uno tenga su inbox propio.

Define el modelo de datos y los contratos de un conector de canal, la provisión del inbox de Chatwoot según tipo de canal y la migración del canal WhatsApp/Evolution existente (E02/E03) bajo esta abstracción. Es la base de las demás historias de E11.

## Documentos

- [Requerimientos](./requirements.md) — el **qué** (EARS).
- [Diseño](./design.md) — el **cómo** (arquitectura, contratos, propiedades).
- [Tareas](./tasks.md) — el **en qué orden** (tareas + grafo de waves).
