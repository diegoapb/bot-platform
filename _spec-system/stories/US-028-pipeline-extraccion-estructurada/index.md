---
id: US-028
title: Pipeline de extracción de información estructurada
epic: E12
cycle: null
status: Pendiente de pruebas
priority: P1
estimate: L
owner: @diego
---

# US-028 · Pipeline de extracción de información estructurada

**Como** plataforma, **quiero** que el LLM extraiga de cada conversación los campos definidos en el esquema del bot y los persista por contacto, **para** convertir conversaciones en datos accionables sin trabajo manual.

Extracción incremental integrada al motor (E06): analiza los mensajes, completa/actualiza el JSON validado contra el esquema de US-027, registra procedencia (de qué mensaje salió cada dato) y respeta los valores corregidos manualmente. Los datos alimentan la memoria por cliente (E07).

## Documentos

- [Requerimientos](./requirements.md) — el **qué** (EARS).
- [Diseño](./design.md) — el **cómo** (arquitectura, contratos, propiedades).
- [Tareas](./tasks.md) — el **en qué orden** (tareas + grafo de waves).
