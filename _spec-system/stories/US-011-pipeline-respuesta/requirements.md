---
id: US-011
---

# Requirements Document

## Introduction

Con canales, identidad y conocimiento listos, esta historia hace que el bot responda: orquesta el contexto completo, invoca el LLM y entrega la respuesta por WhatsApp dejando registro en Chatwoot. Debe ser idempotente, respetar el estado de la conversación y degradar con gracia ante fallos.

## Glossary

| Término | Definición |
|---|---|
| Pipeline | Secuencia mensaje entrante → contexto → LLM → envío → registro. |
| Contexto | System prompt (identidad) + chunks de conocimiento + ítems de catálogo + memoria del contacto + historial reciente. |
| Estado de conversación | `bot` (responde el bot) \| `human` (atiende agente) \| `paused` (nadie responde automático). |
| Generación | Registro de cada invocación al LLM: prompt, respuesta, tokens, latencia. |

## Requirements

### Requirement 1: Respuesta automática

**User Story:** Como cliente final, quiero respuestas relevantes del bot, para resolver mi duda en el momento.

#### Acceptance Criteria

1. WHEN llega un mensaje de texto a una conversación en estado `bot` THE sistema SHALL enviar una respuesta generada por el LLM en menos de 15 segundos.
2. WHEN se genera la respuesta THE sistema SHALL incluir en el contexto la identidad compilada, los chunks relevantes, los ítems de catálogo coincidentes y el historial reciente de la conversación.
3. WHEN se envía la respuesta THE sistema SHALL registrarla en la conversación de Chatwoot como mensaje saliente.
4. IF la conversación está en estado `human` o `paused` THEN THE sistema SHALL abstenerse de generar respuesta.

### Requirement 2: Idempotencia y orden

**User Story:** Como plataforma, quiero procesar cada mensaje exactamente una vez y en orden, para no duplicar ni cruzar respuestas.

#### Acceptance Criteria

1. WHEN el mismo mensaje entrante se recibe varias veces THE sistema SHALL generar a lo sumo una respuesta.
2. WHILE haya una generación en curso para una conversación, THE sistema SHALL encolar los mensajes nuevos y responderlos agrupados al terminar.
3. WHEN el cliente envía varios mensajes en ráfaga (<8 segundos) THE sistema SHALL responder una sola vez al conjunto.

### Requirement 3: Degradación ante fallos

**User Story:** Como admin de tenant, quiero que los fallos del LLM no dejen al cliente sin atención, para proteger la experiencia.

#### Acceptance Criteria

1. IF el LLM falla o excede el timeout THEN THE sistema SHALL transferir la conversación a estado `human` y registrar el motivo como nota privada en Chatwoot.
2. IF el envío por WhatsApp falla tras generar THEN THE sistema SHALL reintentar una vez y, de fallar, registrar la respuesta como nota privada.
3. WHEN ocurre cualquier fallo del pipeline THE sistema SHALL dejar traza consultable con el error.

### Requirement 4: Registro de generaciones

**User Story:** Como admin de plataforma, quiero trazas de cada generación, para auditar costo y calidad.

#### Acceptance Criteria

1. WHEN el LLM produce una respuesta THE sistema SHALL persistir prompt, respuesta, modelo, tokens y latencia asociados a la conversación.
2. WHILE existan trazas de varios tenants, THE sistema SHALL exponerlas solo al tenant dueño (y al super admin).
