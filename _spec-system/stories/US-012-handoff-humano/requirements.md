---
id: US-012
---

# Requirements Document

## Introduction

Ningún bot resuelve todo. Esta historia define el handoff: cómo una conversación pasa del bot a un humano (solicitud explícita, decisión del LLM o acción manual), cómo se entera el equipo, y cómo el bot retoma el control sin pisar al agente.

## Glossary

| Término | Definición |
|---|---|
| Handoff | Transición de la conversación del modo `bot` al modo `human`. |
| Devolución | Transición de `human` (o `paused`) de vuelta a `bot`. |
| Escalamiento por LLM | El modelo decide que no puede/debe responder y lo señala mediante una herramienta. |
| Etiqueta de estado | Label en la conversación de Chatwoot que refleja el modo actual. |

## Requirements

### Requirement 1: Handoff por solicitud del cliente

**User Story:** Como cliente final, quiero pedir un humano en lenguaje natural, para no pelear con un bot.

#### Acceptance Criteria

1. WHEN el cliente expresa intención de hablar con una persona THE sistema SHALL pasar la conversación a modo `human` antes de cualquier otra respuesta del bot.
2. WHEN ocurre el handoff THE sistema SHALL confirmar al cliente que un humano continuará la conversación.
3. WHEN ocurre el handoff THE sistema SHALL marcar la conversación en Chatwoot como pendiente de humano (etiqueta y prioridad).

### Requirement 2: Escalamiento por decisión del LLM

**User Story:** Como admin de tenant, quiero que el bot escale lo que no sabe, para evitar respuestas inventadas.

#### Acceptance Criteria

1. WHEN el LLM determina que no puede responder con la información disponible THE sistema SHALL ejecutar el handoff en lugar de responder.
2. WHEN ocurre el escalamiento THE sistema SHALL registrar el motivo como nota privada en la conversación.

### Requirement 3: Control manual

**User Story:** Como agente, quiero tomar y devolver conversaciones manualmente, para decidir quién atiende.

#### Acceptance Criteria

1. WHEN un agente toma la conversación desde el panel o Chatwoot THE sistema SHALL pasar a modo `human` de inmediato.
2. WHEN un agente devuelve la conversación al bot THE sistema SHALL pasar a modo `bot` y el bot SHALL responder los mensajes que lleguen después.
3. WHEN un admin pausa la conversación THE sistema SHALL pasar a `paused` y nadie responderá automáticamente.

### Requirement 4: Consistencia de estado

**User Story:** Como plataforma, quiero un estado único y visible, para que bot y humanos nunca respondan a la vez.

#### Acceptance Criteria

1. WHILE la conversación esté en `human` o `paused`, THE motor SHALL abstenerse de generar respuestas.
2. WHEN cambia el modo THE sistema SHALL reflejarlo en el panel en menos de 5 segundos.
3. WHEN cambia el modo THE sistema SHALL registrar quién o qué causó la transición y cuándo.
