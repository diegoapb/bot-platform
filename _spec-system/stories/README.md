# Historias de usuario

Una **historia** = unidad demoable. Cada historia es una **carpeta** `US-00X-slug/` con **cuatro documentos**:

| Archivo | Propósito | Guía detallada |
|---|---|---|
| `index.md` | Frontmatter maestro + índice + descripción corta. **Único lugar donde se cambia el `status`.** | _(plantilla abajo)_ |
| `requirements.md` | El **qué**. Sintaxis EARS, criterios numerados. | [`_system/skills/story-requirements`](../_system/skills/story-requirements/SKILL.md) |
| `design.md` | El **cómo**. Arquitectura, contratos, propiedades formales. | [`_system/skills/story-design`](../_system/skills/story-design/SKILL.md) |
| `tasks.md` | El **en qué orden**. Tareas atómicas + grafo de waves. | [`_system/skills/story-tasks`](../_system/skills/story-tasks/SKILL.md) |

## Reglas

- Una historia pertenece a **exactamente una** épica (`epic: E0X`).
- Una historia pertenece a **un solo ciclo** o a ninguno (`cycle: C0X | null`).
- El `index.md` es **corto y conciso**: front-matter, índice de los otros 3 docs, y 1-3 frases de contexto. **No** duplicar contenido de los demás.
- El script `roadmap.mjs` lee únicamente `index.md`. Si falta, la historia se omite.

## Estados (lista cerrada — ver `README.md` raíz)

`Levantamiento de requerimientos` → `Creación de diseño` → `Levantamiento de tareas` → `Pendiente desarrollo` → `En implementación` → `Pendiente de pruebas` → `Probada` → `En CA` → `En producción`

## Plantilla `index.md`

La anatomía completa de los otros tres documentos vive en las skills enlazadas arriba. Aquí solo el `index.md`, porque es corto y entra a cada historia.

```markdown
---
id: US-00X
title: Título corto
epic: E0X
cycle: null              # o C0X
status: Levantamiento de requerimientos
priority: P1             # P0 | P1 | P2 | P3
estimate: S              # XS | S | M | L | XL
owner: @diego
---

# US-00X · Título

**Como** _(rol)_, **quiero** _(capacidad)_, **para** _(beneficio)_.

_(1-3 frases con el contexto/porqué de la historia.)_

## Documentos

- [Requerimientos](./requirements.md) — el **qué** (EARS).
- [Diseño](./design.md) — el **cómo** (arquitectura, contratos, propiedades).
- [Tareas](./tasks.md) — el **en qué orden** (tareas + grafo de waves).
```

## Flujo de creación

1. Crear la carpeta `stories/US-00X-slug/` con el `index.md` mínimo (status `Levantamiento de requerimientos`).
2. Invocar [`story-requirements`](../_system/skills/story-requirements/SKILL.md) → genera `requirements.md`.
3. Confirmar con el humano (human-in-the-loop). Pasar status a `Creación de diseño`.
4. Invocar [`story-design`](../_system/skills/story-design/SKILL.md) → genera `design.md`. Pasar status a `Levantamiento de tareas`.
5. Invocar [`story-tasks`](../_system/skills/story-tasks/SKILL.md) → genera `tasks.md`. Pasar status a `Pendiente desarrollo`.
6. Regenerar el roadmap: `node _spec-system/_system/scripts/roadmap.mjs`.
