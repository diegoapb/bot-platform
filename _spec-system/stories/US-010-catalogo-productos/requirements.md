---
id: US-010
---

# Requirements Document

## Introduction

Los precios y la disponibilidad cambian; el conocimiento en documentos no basta. Esta historia da al tenant un catálogo estructurado de productos/servicios que el bot consulta en tiempo real, garantizando respuestas exactas sobre la oferta.

## Glossary

| Término | Definición |
|---|---|
| Ítem | Producto o servicio del catálogo: nombre, descripción, precio, moneda, disponibilidad y atributos libres. |
| Disponibilidad | Bandera `available \| unavailable \| on_request` que el bot comunica al cliente. |
| Consulta de catálogo | Función interna que devuelve ítems relevantes a un término de búsqueda para inyectar al contexto del LLM. |

## Requirements

### Requirement 1: CRUD de catálogo

**User Story:** Como admin de tenant, quiero crear, editar y archivar ítems del catálogo, para mantener mi oferta al día.

#### Acceptance Criteria

1. WHEN un admin crea un ítem con nombre y precio THE backend SHALL persistirlo asociado al bot.
2. WHEN un admin edita un ítem THE backend SHALL aplicar los cambios y actualizar la fecha de modificación.
3. WHEN un admin archiva un ítem THE backend SHALL excluirlo de las consultas del bot sin borrarlo.
4. IF el precio es negativo o la moneda no es ISO 4217 THEN THE backend SHALL rechazar la operación.
5. WHEN un admin importa un CSV de hasta 500 filas THE backend SHALL crear los ítems válidos y reportar las filas rechazadas con motivo.

### Requirement 2: Consulta para el motor

**User Story:** Como motor conversacional, quiero buscar ítems relevantes a la consulta del cliente, para responder con datos exactos.

#### Acceptance Criteria

1. WHEN el motor consulta el catálogo con un término THE sistema SHALL devolver los ítems activos que coincidan por nombre, descripción o atributos.
2. WHILE existan catálogos de varios bots, THE sistema SHALL devolver solo ítems del bot consultado.
3. IF no hay coincidencias THEN THE sistema SHALL devolver lista vacía sin error.

### Requirement 3: Gestión visible

**User Story:** Como admin, quiero ver mi catálogo con filtros, para auditar lo que el bot ofrece.

#### Acceptance Criteria

1. WHEN un admin lista el catálogo THE sistema SHALL permitir filtrar por texto y disponibilidad.
2. WHEN un member consulta el catálogo THE sistema SHALL permitir solo lectura.
