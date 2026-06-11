---
id: US-005
title: Registro y vinculación de número WhatsApp
epic: E02
cycle: C01
status: Pendiente desarrollo
priority: P0
estimate: L
owner: @diego
---

# US-005 · Registro y vinculación de número WhatsApp

**Como** admin de tenant, **quiero** conectar el número de WhatsApp de mi negocio escaneando un QR, **para** que mis clientes me escriban por el canal que ya usan.

Primera pieza del MVP de canales: crea la instancia en Evolution API por bot, gestiona el ciclo de vida de la conexión y deja el webhook base listo para E03/E06. La tabla `bots` ya existe con `evolutionInstance`.

## Documentos

- [Requerimientos](./requirements.md) — el **qué** (EARS).
- [Diseño](./design.md) — el **cómo** (arquitectura, contratos, propiedades).
- [Tareas](./tasks.md) — el **en qué orden** (tareas + grafo de waves).
