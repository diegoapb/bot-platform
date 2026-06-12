---
id: E12
title: Extracción de información estructurada de conversaciones
status: draft
owner: @diego
---

## Objetivo

Que la plataforma extraiga automáticamente información estructurada de las conversaciones con cada cliente (datos de contacto, intención, pedido, presupuesto, etc.) según un esquema configurable por bot, y que el tenant la vea de forma amigable en el dashboard y pueda corregirla editando el JSON subyacente.

## Alcance

**Dentro**:
- Esquema de extracción configurable por bot (campos, tipos y descripciones — JSON Schema).
- Pipeline de extracción: el LLM analiza la conversación y completa/actualiza el JSON estructurado de forma incremental.
- Persistencia por contacto/conversación con versionado básico (último valor + cuándo y de qué mensaje salió).
- Vista amigable en el dashboard (render legible de los campos extraídos) con edición vía editor JSON validado contra el esquema.
- Integración con la memoria por cliente (E07): los datos extraídos alimentan el contexto del motor.

**Fuera**:
- Exportación a sistemas externos (CRM, hojas de cálculo, webhooks salientes).
- Extracción sobre adjuntos (imágenes, audios, documentos).
- Analytics agregado sobre los datos extraídos (funnels, reportes).
- Edición del esquema mediante UI visual de formularios (en esta épica el esquema se define como JSON).

## Criterios de salida

- [ ] Tras una conversación donde el cliente da su nombre y lo que busca, el dashboard muestra esos campos extraídos sin intervención manual.
- [ ] El tenant corrige un valor extraído editando el JSON y la edición persiste, valida contra el esquema y queda marcada como manual (no la pisa la siguiente extracción automática).
- [ ] Dos bots del mismo tenant pueden tener esquemas de extracción distintos sin interferirse.

<!-- DASHBOARD:START — auto-generado por _system/scripts/dashboards.mjs, no editar a mano -->

## Historias de la épica (3)

**Progreso:** 0/3 en producción (0%) · Levantamiento de requerimientos: 3

| ID | Título | Ciclo | Estado | Prioridad |
| --- | --- | --- | --- | --- |
| [US-027](../stories/US-027-esquema-extraccion-configurable/index.md) | Esquema de extracción configurable por bot | — | Levantamiento de requerimientos | P1 |
| [US-028](../stories/US-028-pipeline-extraccion-estructurada/index.md) | Pipeline de extracción de información estructurada | — | Levantamiento de requerimientos | P1 |
| [US-029](../stories/US-029-vista-edicion-datos-extraidos/index.md) | Vista amigable y edición JSON de los datos extraídos | — | Levantamiento de requerimientos | P1 |

<!-- DASHBOARD:END -->
