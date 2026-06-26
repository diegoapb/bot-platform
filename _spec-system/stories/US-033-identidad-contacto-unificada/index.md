---
id: US-033
title: Identidad de contacto unificada entre canales
epic: E13
cycle: null
status: Pendiente de pruebas
priority: P1
estimate: L
owner: @diego
---

# US-033 · Identidad de contacto unificada entre canales

**Como** agente, **quiero** reconocer al mismo cliente aunque escriba por distintos canales, **para** mantener una sola memoria y contexto del cliente.

Hoy la memoria, los facts y los datos extraídos cuelgan de `channel_link_id`, así que un mismo cliente que escribe por WhatsApp e Instagram aparece como dos personas sin contexto compartido. Esta historia introduce la entidad `contacts` (por agente, materializa la decisión D6 del research de desacople) y re-ancla la memoria al contacto unificado, sin mezclar entre agentes ni tenants.

## Documentos

- [Requerimientos](./requirements.md) — el **qué** (EARS).
- [Diseño](./design.md) — el **cómo** (arquitectura, contratos, propiedades).
- [Tareas](./tasks.md) — el **en qué orden** (tareas + grafo de waves).
