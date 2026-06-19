# Roadmap

> Auto-generado por `_system/scripts/roadmap.mjs`. Última actualización: 2026-06-19.
> No editar a mano — regenerar con: `node _spec-system/_system/scripts/roadmap.mjs`

## Resumen por estado

| Estado | Conteo |
| --- | --- |
| Levantamiento de requerimientos | 14 |
| Creación de diseño | 0 |
| Levantamiento de tareas | 0 |
| Pendiente desarrollo | 4 |
| En implementación | 1 |
| Pendiente de pruebas | 16 |
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
| US-009 | Gestión e ingestión de conocimiento | E05 | Pendiente de pruebas | P1 |
| US-010 | Catálogo de productos y servicios | E05 | Pendiente de pruebas | P1 |
| US-011 | Pipeline de respuesta automática | E06 | Pendiente de pruebas | P0 |
| US-012 | Handoff bot ↔ agente humano | E06 | Pendiente de pruebas | P1 |
| US-013 | Memoria persistente por cliente | E07 | Pendiente de pruebas | P1 |
| US-014 | Panel de operación y despliegue MVP | E08 | En implementación | P1 |

## Backlog (sin ciclo)

| ID | Título | Épica | Estado | Prioridad |
| --- | --- | --- | --- | --- |
| US-015 | Fundaciones del design system — tokens, fuentes y Tailwind | E09 | Levantamiento de requerimientos | P0 |
| US-016 | Librería de componentes UI del design system | E09 | Levantamiento de requerimientos | P0 |
| US-017 | Layout global y navegación alineados al DS | E09 | Levantamiento de requerimientos | P1 |
| US-018 | Migración de páginas y vistas al design system | E09 | Levantamiento de requerimientos | P1 |
| US-019 | Estado de activación global del bot | E10 | Pendiente de pruebas | P0 |
| US-020 | Toggle de activación del bot en el dashboard | E10 | Pendiente de pruebas | P0 |
| US-021 | Abstracción de canal y provisión de inbox por canal | E11 | Pendiente de pruebas | P0 |
| US-022 | Pipeline de respuesta agnóstico de canal vía Chatwoot | E11 | Pendiente de pruebas | P0 |
| US-023 | Canal Telegram | E11 | Pendiente de pruebas | P1 |
| US-024 | Canal WhatsApp Cloud API (oficial) | E11 | Pendiente de pruebas | P1 |
| US-025 | Canales Meta — Instagram DM y Facebook Messenger | E11 | Pendiente de pruebas | P2 |
| US-026 | UI de gestión de canales del bot | E11 | Pendiente de pruebas | P1 |
| US-027 | Esquema de extracción configurable por bot | E12 | Pendiente de pruebas | P1 |
| US-028 | Pipeline de extracción de información estructurada | E12 | Pendiente de pruebas | P1 |
| US-029 | Vista amigable y edición JSON de los datos extraídos | E12 | Pendiente de pruebas | P1 |
| US-030 | Entidad Agente y migracion bot->agente | E13 | Levantamiento de requerimientos | P0 |
| US-031 | Asignación N:M canal-agente y ruteo de inbound por agente | E13 | Levantamiento de requerimientos | P0 |
| US-032 | Biblioteca de conocimiento reutilizable y enlace a agentes | E13 | Levantamiento de requerimientos | P0 |
| US-033 | Identidad de contacto unificada entre canales | E13 | Levantamiento de requerimientos | P1 |
| US-034 | UI de gestion de agentes | E13 | Levantamiento de requerimientos | P1 |
| US-035 | Multiples agentes por canal y etapa del contacto | E14 | Levantamiento de requerimientos | P1 |
| US-036 | Motor de reglas de ruteo declarativas | E14 | Levantamiento de requerimientos | P1 |
| US-037 | Agente orquestador de ruteo (fallback LLM) | E14 | Levantamiento de requerimientos | P2 |
| US-038 | Resolucion y fijacion del agente al inicio de la conversacion | E14 | Levantamiento de requerimientos | P1 |
| US-039 | UI de configuracion de ruteo multi-agente | E14 | Levantamiento de requerimientos | P2 |

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
| US-009 | Gestión e ingestión de conocimiento | C01 | Pendiente de pruebas |
| US-010 | Catálogo de productos y servicios | C01 | Pendiente de pruebas |

### E06 — Motor conversacional  · _ready_
| ID | Título | Ciclo | Estado |
| --- | --- | --- | --- |
| US-011 | Pipeline de respuesta automática | C01 | Pendiente de pruebas |
| US-012 | Handoff bot ↔ agente humano | C01 | Pendiente de pruebas |

### E07 — Memoria por cliente  · _ready_
| ID | Título | Ciclo | Estado |
| --- | --- | --- | --- |
| US-013 | Memoria persistente por cliente | C01 | Pendiente de pruebas |

### E08 — Operación y observabilidad MVP  · _ready_
| ID | Título | Ciclo | Estado |
| --- | --- | --- | --- |
| US-014 | Panel de operación y despliegue MVP | C01 | En implementación |

### E09 — Alineación de la UI al Open Solvex Design System  · _draft_
| ID | Título | Ciclo | Estado |
| --- | --- | --- | --- |
| US-015 | Fundaciones del design system — tokens, fuentes y Tailwind | — | Levantamiento de requerimientos |
| US-016 | Librería de componentes UI del design system | — | Levantamiento de requerimientos |
| US-017 | Layout global y navegación alineados al DS | — | Levantamiento de requerimientos |
| US-018 | Migración de páginas y vistas al design system | — | Levantamiento de requerimientos |

### E10 — Activación y ciclo de vida del bot  · _in-progress_
| ID | Título | Ciclo | Estado |
| --- | --- | --- | --- |
| US-019 | Estado de activación global del bot | — | Pendiente de pruebas |
| US-020 | Toggle de activación del bot en el dashboard | — | Pendiente de pruebas |

### E11 — Multicanal vía Chatwoot  · _in-progress_
| ID | Título | Ciclo | Estado |
| --- | --- | --- | --- |
| US-021 | Abstracción de canal y provisión de inbox por canal | — | Pendiente de pruebas |
| US-022 | Pipeline de respuesta agnóstico de canal vía Chatwoot | — | Pendiente de pruebas |
| US-023 | Canal Telegram | — | Pendiente de pruebas |
| US-024 | Canal WhatsApp Cloud API (oficial) | — | Pendiente de pruebas |
| US-025 | Canales Meta — Instagram DM y Facebook Messenger | — | Pendiente de pruebas |
| US-026 | UI de gestión de canales del bot | — | Pendiente de pruebas |

### E12 — Extracción de información estructurada de conversaciones  · _in-progress_
| ID | Título | Ciclo | Estado |
| --- | --- | --- | --- |
| US-027 | Esquema de extracción configurable por bot | — | Pendiente de pruebas |
| US-028 | Pipeline de extracción de información estructurada | — | Pendiente de pruebas |
| US-029 | Vista amigable y edición JSON de los datos extraídos | — | Pendiente de pruebas |

### E13 — Desacople agente ↔ canal y biblioteca de conocimiento  · _draft_
| ID | Título | Ciclo | Estado |
| --- | --- | --- | --- |
| US-030 | Entidad Agente y migracion bot->agente | — | Levantamiento de requerimientos |
| US-031 | Asignación N:M canal-agente y ruteo de inbound por agente | — | Levantamiento de requerimientos |
| US-032 | Biblioteca de conocimiento reutilizable y enlace a agentes | — | Levantamiento de requerimientos |
| US-033 | Identidad de contacto unificada entre canales | — | Levantamiento de requerimientos |
| US-034 | UI de gestion de agentes | — | Levantamiento de requerimientos |

### E14 — Ruteo multi-agente por reglas dentro de un canal  · _draft_
| ID | Título | Ciclo | Estado |
| --- | --- | --- | --- |
| US-035 | Multiples agentes por canal y etapa del contacto | — | Levantamiento de requerimientos |
| US-036 | Motor de reglas de ruteo declarativas | — | Levantamiento de requerimientos |
| US-037 | Agente orquestador de ruteo (fallback LLM) | — | Levantamiento de requerimientos |
| US-038 | Resolucion y fijacion del agente al inicio de la conversacion | — | Levantamiento de requerimientos |
| US-039 | UI de configuracion de ruteo multi-agente | — | Levantamiento de requerimientos |
