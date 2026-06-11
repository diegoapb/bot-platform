# Roadmap

> Auto-generado por `_system/scripts/roadmap.mjs`. Última actualización: 2026-06-11.
> No editar a mano — regenerar con: `node _spec-system/_system/scripts/roadmap.mjs`

## Resumen por estado

| Estado | Conteo |
| --- | --- |
| Levantamiento de requerimientos | 0 |
| Creación de diseño | 0 |
| Levantamiento de tareas | 0 |
| Pendiente desarrollo | 10 |
| En implementación | 0 |
| Pendiente de pruebas | 0 |
| Probada | 0 |
| En CA | 0 |
| En producción | 4 |

## Por ciclo

### C00 — Bootstrap (2026-05-10 → 2026-06-06)

_Dejar la base de identidad, multitenancy y onboarding lista para empezar a construir producto encima._

| ID | Título | Épica | Estado | Prioridad |
| --- | --- | --- | --- | --- |
| US-001 | Autenticación con Clerk | E01 | En producción | P0 |
| US-002 | Multitenancy con Clerk Organizations | E01 | En producción | P0 |
| US-003 | Super admin de plataforma | E01 | En producción | P1 |
| US-004 | Onboarding de desarrollo local | E01 | En producción | P1 |

### C01 — MVP (2026-06-10 → 2026-07-31)

_Entregar el MVP — bot de WhatsApp con identidad, conocimiento y memoria, operando sobre Chatwoot + Evolution API._

| ID | Título | Épica | Estado | Prioridad |
| --- | --- | --- | --- | --- |
| US-005 | Registro y vinculación de número WhatsApp | E02 | Pendiente desarrollo | P0 |
| US-006 | Provisión de cuenta e inbox Chatwoot por tenant | E03 | Pendiente desarrollo | P0 |
| US-007 | Sincronización bidireccional de mensajes | E03 | Pendiente desarrollo | P0 |
| US-008 | Gestión de identidad del agente | E04 | Pendiente desarrollo | P1 |
| US-009 | Gestión e ingestión de conocimiento | E05 | Pendiente desarrollo | P1 |
| US-010 | Catálogo de productos y servicios | E05 | Pendiente desarrollo | P1 |
| US-011 | Pipeline de respuesta automática | E06 | Pendiente desarrollo | P0 |
| US-012 | Handoff bot ↔ agente humano | E06 | Pendiente desarrollo | P1 |
| US-013 | Memoria persistente por cliente | E07 | Pendiente desarrollo | P1 |
| US-014 | Panel de operación y despliegue MVP | E08 | Pendiente desarrollo | P1 |

## Backlog (sin ciclo)

_(sin historias)_

## Por épica

### E01 — Fundamentos — autenticación y multitenancy  · _done_
| ID | Título | Ciclo | Estado |
| --- | --- | --- | --- |
| US-001 | Autenticación con Clerk | C00 | En producción |
| US-002 | Multitenancy con Clerk Organizations | C00 | En producción |
| US-003 | Super admin de plataforma | C00 | En producción |
| US-004 | Onboarding de desarrollo local | C00 | En producción |

### E02 — Conexión WhatsApp vía Evolution API  · _ready_
| ID | Título | Ciclo | Estado |
| --- | --- | --- | --- |
| US-005 | Registro y vinculación de número WhatsApp | C01 | Pendiente desarrollo |

### E03 — Integración Chatwoot  · _ready_
| ID | Título | Ciclo | Estado |
| --- | --- | --- | --- |
| US-006 | Provisión de cuenta e inbox Chatwoot por tenant | C01 | Pendiente desarrollo |
| US-007 | Sincronización bidireccional de mensajes | C01 | Pendiente desarrollo |

### E04 — Identidad del agente  · _ready_
| ID | Título | Ciclo | Estado |
| --- | --- | --- | --- |
| US-008 | Gestión de identidad del agente | C01 | Pendiente desarrollo |

### E05 — Base de conocimiento y catálogo  · _ready_
| ID | Título | Ciclo | Estado |
| --- | --- | --- | --- |
| US-009 | Gestión e ingestión de conocimiento | C01 | Pendiente desarrollo |
| US-010 | Catálogo de productos y servicios | C01 | Pendiente desarrollo |

### E06 — Motor conversacional  · _ready_
| ID | Título | Ciclo | Estado |
| --- | --- | --- | --- |
| US-011 | Pipeline de respuesta automática | C01 | Pendiente desarrollo |
| US-012 | Handoff bot ↔ agente humano | C01 | Pendiente desarrollo |

### E07 — Memoria por cliente  · _ready_
| ID | Título | Ciclo | Estado |
| --- | --- | --- | --- |
| US-013 | Memoria persistente por cliente | C01 | Pendiente desarrollo |

### E08 — Operación y observabilidad MVP  · _ready_
| ID | Título | Ciclo | Estado |
| --- | --- | --- | --- |
| US-014 | Panel de operación y despliegue MVP | C01 | Pendiente desarrollo |
