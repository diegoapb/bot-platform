---
id: US-008
---

# Requirements Document

## Introduction

La identidad es lo que diferencia un bot genérico de un agente de marca. Esta historia da al tenant un editor de documentos de identidad por bot, con plantillas, versionado e historial, y expone la identidad compilada para el motor conversacional.

## Glossary

| Término | Definición |
|---|---|
| Documento de identidad | Markdown con un aspecto del agente: `SOUL` (personalidad), `IDENTITY` (quién es, negocio), `GUARDRAILS` (límites y reglas). |
| Versión | Snapshot inmutable del contenido de un documento al guardarlo. |
| Identidad compilada | Concatenación ordenada de los documentos vigentes, lista para usarse como system prompt. |
| Plantilla | Contenido inicial sugerido por tipo de documento. |

## Requirements

### Requirement 1: Edición de documentos

**User Story:** Como admin de tenant, quiero editar los documentos de identidad de mi bot, para definir cómo habla y qué no debe hacer.

#### Acceptance Criteria

1. WHEN un admin abre la identidad de un bot por primera vez THE sistema SHALL mostrar los tres tipos de documento con su plantilla inicial.
2. WHEN un admin guarda un documento THE backend SHALL persistir el contenido como nueva versión vigente.
3. IF el contenido supera 20.000 caracteres THEN THE backend SHALL rechazar el guardado indicando el límite.
4. WHEN un `org:member` sin permiso de administración accede THE sistema SHALL permitir lectura pero rechazar escritura.

### Requirement 2: Versionado e historial

**User Story:** Como admin de tenant, quiero ver el historial de cambios y restaurar versiones, para experimentar sin miedo.

#### Acceptance Criteria

1. WHEN se guarda un documento THE backend SHALL conservar todas las versiones anteriores con autor y fecha.
2. WHEN un admin restaura una versión anterior THE backend SHALL crear una nueva versión vigente con ese contenido sin borrar el historial.
3. WHEN un admin consulta el historial THE sistema SHALL listar las versiones en orden cronológico inverso.

### Requirement 3: Identidad compilada para el motor

**User Story:** Como motor conversacional, quiero obtener la identidad vigente de un bot en una llamada, para construir el system prompt.

#### Acceptance Criteria

1. WHEN el motor solicita la identidad de un bot THE backend SHALL devolver los documentos vigentes concatenados en orden SOUL → IDENTITY → GUARDRAILS.
2. IF un documento está vacío o no existe THEN THE backend SHALL omitirlo sin error.
3. WHEN se guarda una nueva versión THE identidad compilada SHALL reflejar el cambio inmediatamente.
