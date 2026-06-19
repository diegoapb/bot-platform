---
id: US-032
---

# Requirements Document

## Introduction

El desacople agente↔canal (E13) exige que el conocimiento deje de pertenecer a un único bot y pase a ser una **biblioteca reutilizable**: colecciones que un mismo tenant puede enlazar a uno o varios agentes para compartir y heredar saber sin duplicarlo. Esta historia define el qué del CRUD de colecciones, el enlace/desenlace N:M agente↔colección, la recuperación semántica por agente sobre sus colecciones enlazadas (reemplazando la búsqueda por bot), la propagación viva de cambios y las garantías de aislamiento por tenant y de ausencia de huérfanos. La gestión visual y la unificación de contacto quedan fuera (US-034 y US-033).

## Glossary

| Término | Definición |
|---|---|
| Colección | Unidad reutilizable de conocimiento de un tenant. Agrupa fuentes y sus chunks. Es la entidad que se enlaza a agentes (no la fuente suelta). |
| Fuente | Unidad de conocimiento cargada dentro de una colección: texto, archivo (md/txt/pdf) o FAQ. Pasa a pertenecer a una colección, no a un bot. |
| Chunk | Fragmento indexado de una fuente con su embedding, recuperable por similitud. Pertenece a la colección de su fuente. |
| Agente | El "cerebro" (identidad/prompt + modelo + conocimiento enlazado), entidad propia introducida en E13 (US-031). |
| Enlace | Relación agente↔colección. Mientras existe, el agente "ve" esa colección al recuperar conocimiento. |
| Referencia viva | Semántica del enlace: editar el contenido de una colección afecta inmediatamente a todos los agentes que la enlazan, sin re-enlazar ni copiar. |
| Conocimiento visible del agente | Unión de todas las colecciones enlazadas a un agente (propias y heredadas de otros agentes del tenant). |
| `retrieve(agentId, query, k)` | Recuperación interna que devuelve los k chunks más relevantes a una consulta, buscando solo en las colecciones enlazadas al agente. Reemplaza `retrieve(botId, …)`. |
| Tenant | Organización de Clerk (`tenant_id`). Frontera de aislamiento: colecciones, agentes y enlaces nunca cruzan tenants. |
| Huérfano | Chunk o fuente cuya colección ya no existe, o enlace que apunta a una colección o agente inexistente. |

## Requirements

### Requirement 1: CRUD de colecciones

**User Story:** Como admin de tenant, quiero crear, renombrar, describir y eliminar colecciones de conocimiento, para organizar el saber del tenant en unidades reutilizables.

#### Acceptance Criteria

1. WHEN un admin crea una colección con nombre THE backend SHALL persistir la colección asociada a su tenant.
2. IF el nombre de la colección está vacío THEN THE backend SHALL rechazar la creación indicando el motivo.
3. WHEN un admin renombra o edita la descripción de una colección de su tenant THE backend SHALL persistir el cambio.
4. WHEN un admin lista las colecciones THE backend SHALL devolver únicamente las colecciones de su tenant con nombre, descripción y conteo de fuentes.
5. WHEN un admin elimina una colección THE backend SHALL eliminar también todas sus fuentes y todos sus chunks.
6. WHEN un admin elimina una colección que está enlazada a uno o más agentes THE backend SHALL eliminar también esos enlaces.
7. WHEN el backend persiste una colección recién creada THE backend SHALL devolver el identificador de la colección.

### Requirement 2: Fuentes y chunks pertenecen a una colección

**User Story:** Como plataforma, quiero que cada fuente y cada chunk pertenezcan a una colección, para que el conocimiento sea reutilizable y no quede atado a un solo agente.

#### Acceptance Criteria

1. WHEN un admin carga una fuente THE backend SHALL asociarla a una colección existente de su tenant.
2. IF la colección destino no existe o pertenece a otro tenant THEN THE backend SHALL rechazar la carga de la fuente.
3. WHEN una fuente queda indexada THE backend SHALL asociar todos sus chunks a la misma colección que la fuente.
4. WHEN una fuente se reindexa THE backend SHALL reemplazar sus chunks anteriores sin dejar chunks huérfanos en la colección.
5. WHILE una fuente pertenezca a una colección, THE backend SHALL conservar el aislamiento por tenant de la fuente y de sus chunks.

### Requirement 3: Enlazar y desenlazar colecciones a un agente

**User Story:** Como admin de tenant, quiero enlazar y desenlazar colecciones a un agente, para definir qué conocimiento usa cada agente sin duplicarlo.

#### Acceptance Criteria

1. WHEN un admin enlaza una colección a un agente del mismo tenant THE backend SHALL crear el enlace agente↔colección.
2. IF la colección y el agente no pertenecen al mismo tenant THEN THE backend SHALL rechazar el enlace.
3. IF el enlace agente↔colección ya existe THEN THE backend SHALL tratar la operación como idempotente sin crear un duplicado.
4. WHEN un admin desenlaza una colección de un agente THE backend SHALL eliminar el enlace sin borrar la colección ni sus fuentes ni sus chunks.
5. WHEN un admin consulta el conocimiento visible de un agente THE backend SHALL devolver la unión de las colecciones enlazadas a ese agente.
6. WHEN una misma colección está enlazada a varios agentes THE backend SHALL exponerla a todos ellos como conocimiento visible.

### Requirement 4: Recuperación semántica por agente

**User Story:** Como motor conversacional, quiero recuperar los chunks relevantes según el agente que atiende, para fundamentar la respuesta solo con el conocimiento que ese agente tiene enlazado.

#### Acceptance Criteria

1. WHEN el motor invoca la recuperación con una consulta y un agente THE backend SHALL devolver a lo sumo k chunks ordenados por similitud descendente.
2. WHILE existan chunks de colecciones no enlazadas al agente, THE backend SHALL excluirlos del resultado.
3. WHILE existan chunks de otro tenant, THE backend SHALL excluirlos del resultado.
4. IF el agente no tiene ninguna colección enlazada THEN THE backend SHALL devolver lista vacía.
5. IF ningún chunk supera el umbral mínimo de similitud THEN THE backend SHALL devolver lista vacía.

### Requirement 5: Referencia viva y propagación de cambios

**User Story:** Como admin de tenant, quiero que al editar una colección el cambio se refleje en todos los agentes que la enlazan, para mantener una sola fuente de verdad del conocimiento.

#### Acceptance Criteria

1. WHEN un admin añade, edita o elimina una fuente de una colección THE backend SHALL reflejar el cambio en la recuperación de todos los agentes que enlazan esa colección.
2. WHILE una colección esté enlazada a varios agentes, THE backend SHALL servir el mismo contenido a todos ellos sin copiarlo por agente.
3. WHEN un admin desenlaza una colección de un agente THE backend SHALL dejar de exponer los chunks de esa colección a ese agente en la recuperación.

### Requirement 6: Migración sin pérdida ni huérfanos

**User Story:** Como plataforma, quiero migrar el conocimiento existente por bot a colecciones enlazadas a su agente, para no perder datos al adoptar la biblioteca.

#### Acceptance Criteria

1. WHEN se ejecuta la migración THE backend SHALL crear, por cada bot con conocimiento, una colección que contenga sus fuentes y chunks actuales.
2. WHEN la migración crea la colección de un bot THE backend SHALL enlazarla al agente correspondiente a ese bot.
3. WHEN la migración finaliza THE backend SHALL conservar el mismo número de fuentes y de chunks que existían antes de migrar.
4. WHEN la migración finaliza THE backend SHALL dejar cada fuente y cada chunk asociado a exactamente una colección, sin huérfanos.
5. IF la migración se ejecuta más de una vez THEN THE backend SHALL producir el mismo resultado sin duplicar colecciones ni enlaces.
