---
id: US-007
---

# Requirements Document

## Introduction

Con la instancia de WhatsApp (US-005) y el inbox de Chatwoot (US-006) provisionados, esta historia une ambos mundos: cada mensaje de WhatsApp se refleja en Chatwoot y cada respuesta del agente vuelve al cliente, sin duplicados ni ecos, manteniendo un mapeo persistente de contactos y conversaciones.

## Glossary

| Término | Definición |
|---|---|
| Contacto | Persona que escribe por WhatsApp, identificada por teléfono normalizado E.164. |
| Conversación | Hilo en Chatwoot asociado a un contacto y un inbox. |
| Eco | Mensaje saliente que el webhook devuelve como entrante y se reprocesa por error. |
| Mapeo | Tabla que relaciona ids de Evolution (remoteJid) con ids de Chatwoot (contact/conversation). |

## Requirements

### Requirement 1: Mensaje entrante WhatsApp → Chatwoot

**User Story:** Como agente, quiero ver cada WhatsApp entrante como mensaje en Chatwoot, para atender desde un solo lugar.

#### Acceptance Criteria

1. WHEN llega un mensaje de texto entrante por el webhook de Evolution THE backend SHALL crear el mensaje en la conversación de Chatwoot correspondiente en menos de 5 segundos.
2. IF el contacto no existe en Chatwoot THEN THE backend SHALL crearlo con teléfono normalizado y nombre del perfil de WhatsApp.
3. IF no hay conversación abierta para el contacto THEN THE backend SHALL crear una nueva en el inbox del bot.
4. WHEN el mismo mensaje llega más de una vez (reintento del webhook) THE backend SHALL procesarlo exactamente una vez.

### Requirement 2: Respuesta de agente Chatwoot → WhatsApp

**User Story:** Como agente, quiero que mi respuesta en Chatwoot llegue al WhatsApp del cliente, para cerrar el ciclo de atención.

#### Acceptance Criteria

1. WHEN un agente crea un mensaje saliente en Chatwoot THE backend SHALL enviarlo por Evolution al teléfono del contacto.
2. IF el envío por Evolution falla THEN THE backend SHALL registrar el fallo y reflejarlo como nota privada en la conversación.
3. WHEN el mensaje enviado regresa por el webhook de Evolution como propio (fromMe) THE backend SHALL ignorarlo sin crear duplicados en Chatwoot.

### Requirement 3: Mapeo persistente

**User Story:** Como plataforma, quiero un mapeo durable entre Evolution y Chatwoot, para no recrear contactos ni perder hilos.

#### Acceptance Criteria

1. WHEN se crea un contacto o conversación en Chatwoot THE backend SHALL persistir la relación con el identificador de WhatsApp y el bot.
2. WHEN llega cualquier mensaje posterior del mismo contacto THE backend SHALL resolver la conversación desde el mapeo sin consultar a Chatwoot.
3. WHILE exista el mapeo, THE backend SHALL garantizar que un contacto de WhatsApp corresponde a exactamente un contacto de Chatwoot por inbox.

### Requirement 4: Alcance de contenido

**User Story:** Como plataforma, quiero acotar los tipos de mensaje del MVP, para mantener el flujo confiable.

#### Acceptance Criteria

1. WHEN llega un mensaje no textual (imagen, audio, sticker, ubicación) THE backend SHALL registrar en Chatwoot una nota indicando el tipo recibido.
2. IF llega un mensaje de un grupo de WhatsApp THEN THE backend SHALL descartarlo sin crear conversación.
