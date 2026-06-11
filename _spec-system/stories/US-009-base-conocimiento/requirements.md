---
id: US-009
---

# Requirements Document

## Introduction

El bot solo es útil si sabe del negocio. Esta historia construye la base de conocimiento por bot: carga de fuentes (texto, archivos, FAQs), procesamiento a chunks con embeddings y búsqueda semántica para el motor conversacional, con aislamiento total entre tenants.

## Glossary

| Término | Definición |
|---|---|
| Fuente | Unidad de conocimiento cargada: texto pegado, archivo (md/txt/pdf) o FAQ (pregunta+respuesta). |
| Chunk | Fragmento de una fuente (~500 tokens) indexado individualmente con su embedding. |
| Embedding | Vector numérico del chunk para búsqueda por similitud (pgvector). |
| `retrieve()` | Función interna que devuelve los k chunks más relevantes para una consulta de un bot. |

## Requirements

### Requirement 1: Carga de fuentes

**User Story:** Como admin de tenant, quiero cargar texto, archivos y FAQs, para alimentar el conocimiento del bot.

#### Acceptance Criteria

1. WHEN un admin pega texto con título THE backend SHALL crear la fuente y encolarla para indexado.
2. WHEN un admin sube un archivo md, txt o pdf de hasta 10 MB THE backend SHALL extraer su texto y crear la fuente.
3. IF el archivo excede 10 MB o el formato no es soportado THEN THE backend SHALL rechazarlo indicando el motivo.
4. WHEN un admin crea una FAQ THE backend SHALL almacenarla como fuente de tipo faq con pregunta y respuesta.
5. WHEN un admin elimina una fuente THE backend SHALL eliminar también todos sus chunks del índice.

### Requirement 2: Indexado

**User Story:** Como plataforma, quiero procesar cada fuente a chunks con embeddings, para hacerla recuperable semánticamente.

#### Acceptance Criteria

1. WHEN una fuente queda creada THE backend SHALL dejarla indexada y buscable en menos de 60 segundos.
2. WHILE una fuente se procesa, THE sistema SHALL exponer su estado (`pending | indexing | ready | failed`).
3. IF el indexado falla THEN THE sistema SHALL marcar la fuente como `failed` y permitir reintentar.
4. WHEN una fuente se reindexada THE backend SHALL reemplazar los chunks anteriores sin dejar huérfanos.

### Requirement 3: Búsqueda semántica interna

**User Story:** Como motor conversacional, quiero recuperar los chunks relevantes a la consulta del cliente, para fundamentar la respuesta.

#### Acceptance Criteria

1. WHEN el motor invoca la búsqueda con una consulta y un bot THE sistema SHALL devolver a lo sumo k chunks ordenados por similitud descendente.
2. WHILE existan fuentes de varios bots o tenants, THE sistema SHALL devolver únicamente chunks del bot consultado.
3. IF ningún chunk supera el umbral mínimo de similitud THEN THE sistema SHALL devolver lista vacía.

### Requirement 4: Gestión visible

**User Story:** Como admin de tenant, quiero ver y probar mi base de conocimiento, para confiar en lo que sabe el bot.

#### Acceptance Criteria

1. WHEN un admin lista las fuentes THE sistema SHALL mostrar título, tipo, estado y fecha.
2. WHEN un admin ejecuta una búsqueda de prueba THE sistema SHALL mostrar los chunks recuperados con su score.
