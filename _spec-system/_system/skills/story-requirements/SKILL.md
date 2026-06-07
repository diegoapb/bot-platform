---
name: story-requirements
description: Crear o refinar el requirements.md de una historia siguiendo la sintaxis EARS de Kiro.
inputs:
  - name: story_id
    type: string
    required: true
  - name: idioma
    type: string
    required: false
    default: español
outputs:
  - stories/US-00X-slug/requirements.md
---

## Cuándo usarla

- La historia entra al estado **Levantamiento de requerimientos**.
- Hay que **refinar criterios** después de feedback del PO o del equipo.
- Apareció un **caso borde** que no estaba contemplado.

## Filosofía

> El humano siempre está en el loop. El requirements.md no es un artefacto que el agente "entrega y olvida": se itera con el equipo hasta que el alcance queda inequívoco.

Inspirado en **Kiro – Requirements First** (https://kiro.dev/docs/specs/feature-specs/requirements-first/). Se adopta la sintaxis **EARS** (Easy Approach to Requirements Syntax) para eliminar ambigüedad:

| Cláusula | Significado |
|---|---|
| `WHEN <evento>` | Condición o evento disparador. |
| `THE <sistema/componente>` | Sujeto que debe cumplir la acción. |
| `SHALL <acción>` | Obligatoriedad (no opcional, no negociable). |
| `IF <condición> THEN …` | Caso alternativo o borde. |
| `WHILE <estado>` | Condición que se mantiene activa durante un estado. |

## Anatomía del documento

```
# Requirements Document
## Introduction
## Glossary
## Requirements
  ### Requirement 1: [Título]
    **User Story:** Como <rol>, quiero <capacidad>, para <beneficio>.
    #### Acceptance Criteria
      1. WHEN <evento> THE <componente> SHALL <acción>
      2. IF <condición> THEN THE <componente> SHALL <acción>
      3. WHILE <estado>, THE <componente> SHALL <acción>
  ### Requirement 2: [Título]
    ...
```

Cada criterio numerado es **citable** (ej. "requisito 1.2") desde `design.md` y `tasks.md`. Esa numeración no cambia una vez publicada — si hay que añadir, se agrega al final.

## Responsabilidades del orquestador (human-in-the-loop)

Al cerrar la fase de requirements, el agente debe verificar con el humano:

- [ ] Los requisitos están **completos** (no falta funcionalidad obvia).
- [ ] La user story refleja el **valor real** para el rol.
- [ ] Los criterios de aceptación cubren **escenarios borde y de error**.
- [ ] Hay **glosario** de términos del dominio que pueden ser ambiguos.
- [ ] El humano **confirma explícitamente** que los requisitos satisfacen la necesidad.

Si alguno está en duda, **iterar antes de avanzar** a `design.md`.

## Plantilla

```markdown
---
id: US-00X
---

# Requirements Document

## Introduction

_(2-4 frases. Problema que resuelve esta historia, contexto y valor esperado.)_

## Glossary

| Término | Definición |
|---|---|
| _(término)_ | _(definición desambiguada)_ |

## Requirements

### Requirement 1: Título corto

**User Story:** Como _(rol)_, quiero _(capacidad)_, para _(beneficio)_.

#### Acceptance Criteria

1. WHEN _(evento)_ THE _(componente)_ SHALL _(acción observable)_.
2. IF _(condición alterna)_ THEN THE _(componente)_ SHALL _(acción)_.
3. WHILE _(estado mantenido)_, THE _(componente)_ SHALL _(acción)_.

### Requirement 2: …

**User Story:** …

#### Acceptance Criteria

1. WHEN …
```

## Reglas de calidad

- **Una acción por SHALL**. Si la frase tiene "y" entre verbos, divídela.
- **Verbos observables**: "muestra", "rechaza", "persiste", "emite evento". Evita "maneja", "soporta", "gestiona".
- **Sin detalle de implementación**: nada de "Postgres", "endpoint", "React". Eso va en `design.md`.
- **Idempotencia**: si un criterio puede dispararse dos veces, dilo. EARS no asume nada.
- **Idioma**: español, salvo que el orquestador pida otro.

## Transición

Al confirmar requirements con el humano:
- Actualiza `index.md` → `status: Creación de diseño`.
- Pasa el control a la skill `story-design`.
