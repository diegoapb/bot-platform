---
name: story-tasks
description: Crear el tasks.md de una historia. Plan de implementación atómico con grafo de dependencias.
inputs:
  - name: story_id
    type: string
    required: true
outputs:
  - stories/US-00X-slug/tasks.md
---

## Cuándo usarla

- `design.md` ya está firmado por el humano.
- Historia entra al estado **Levantamiento de tareas**.
- Es el **último artefacto** generado en todos los flujos: requiere "qué" y "cómo" definidos.

## Filosofía

`tasks.md` descompone el diseño en **tareas atómicas con dependencias explícitas** para que un agente (o un humano) las ejecute secuencialmente. Cada tarea es ejecutable, verificable y citable.

Una tarea cumple **todas** estas condiciones:

- Toca un conjunto acotado de archivos (escritos en la tarea).
- Tiene **expected outcomes PASS/FAIL** comprobables.
- Cita los **requirements** que valida (ej. "1.1, 2.3").
- Cita las **correctness properties** del diseño (ej. "P1, P2").
- Si tiene precedentes, declara su dependencia en el grafo.

## Anatomía del documento

```
# Tasks
## Overview        — Resumen del plan
## Tasks           — Lista con checkboxes y subtareas
  - [ ] Task N: [Título]
    - Archivos a crear o modificar
    - Criterios de completitud (PASS/FAIL)
    - Referencias a propiedades formales (P1, P2…)
    - Requirements validados (1.1, 2.1…)
## Task Dependency Graph   — JSON con "waves" de ejecución paralela
## Notes           — Contexto y dependencias externas
```

## El Task Dependency Graph

JSON que agrupa tareas en **waves** (oleadas):
- Tareas de la **misma wave** son **paralelizables**.
- Waves se ejecutan **secuencialmente**.
- Permite a un orquestador optimizar la ejecución sin reanalizar dependencias.

Formato:

```json
{
  "waves": [
    { "id": 1, "tasks": ["T1", "T2"] },
    { "id": 2, "tasks": ["T3"], "depends_on": [1] },
    { "id": 3, "tasks": ["T4", "T5"], "depends_on": [2] }
  ]
}
```

Reglas:
- Cada tarea aparece **una sola vez** en el grafo.
- `depends_on` lista los IDs de waves previas; si no se declara, asume la wave anterior.
- Si T5 depende de T3 pero no de T4, **divide la wave**: nadie debe inferir orden dentro de una wave.

## Plantilla

```markdown
---
id: US-00X
---

# Tasks — US-00X · Título

## Overview

_(2-4 frases. Estrategia de implementación, qué se construye primero y por qué.)_

## Tasks

- [ ] **T1 — Migración Drizzle para tabla `…`**
  - Archivos: `apps/backend/drizzle/000X_…sql`, `apps/backend/src/db/schema.ts`
  - PASS si: `pnpm db:migrate` aplica sin error y la tabla expone las columnas X, Y, Z.
  - FAIL si: nombres o tipos divergen del data model del diseño.
  - Properties: P1
  - Requirements: 1.1

- [ ] **T2 — Endpoint `POST /api/…`**
  - Archivos: `apps/backend/src/routes/…ts`
  - PASS si: payload válido → 200 + DTO esperado; payload inválido → 422 con mensaje.
  - FAIL si: cualquier criterio de error de diseño no devuelve el código correspondiente.
  - Properties: P1, P2
  - Requirements: 1.1, 1.2

- [ ] **T3 — Componente UI `<X>`**
  - Archivos: `apps/frontend/src/components/X.tsx`
  - PASS si: render sin warnings + storybook visual ok + interacción dispara la mutación.
  - FAIL si: accesibilidad rota (axe), o el botón no muestra estado de carga.
  - Properties: P2
  - Requirements: 2.1

- [ ] **T4 — Tests de integración del flujo completo**
  - Archivos: `apps/backend/test/…ts`
  - PASS si: setup → request → assertion en DB pasan en CI.
  - FAIL si: cualquier test no es determinístico.
  - Properties: P1, P2
  - Requirements: 1.1, 1.2, 2.1

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 1, "tasks": ["T1"] },
    { "id": 2, "tasks": ["T2", "T3"], "depends_on": [1] },
    { "id": 3, "tasks": ["T4"], "depends_on": [2] }
  ]
}
```

## Commits

Conforme se ejecutan, dejar el SHA junto a la tarea:
- T1 — `abc1234`
- T2 — `def5678`

## Research consultada

- `research/2026-06-10-baileys-vs-cloud-api.md` — fundamentó T2.
- `research/2026-06-12-revision-seguridad.md` — fundamentó T4.

## Notes

- Dependencias externas (servicios, cuotas, claves).
- Supuestos pendientes de confirmar.
```

## Reglas de calidad

- **Atomicidad**: si una tarea necesita >3 archivos no triviales, divídela.
- **Sin tareas "varios"**: cada tarea tiene un objetivo único y verificable.
- **Requirements y Properties siempre presentes**: si una tarea no cubre nada, sobra.
- **Grafo conexo**: la última wave debe llevarte al estado "historia terminada". Si queda una tarea suelta sin referencia, falta una dependencia.

## Transición

Al cerrar tareas con el humano:
- Actualiza `index.md` → `status: Pendiente desarrollo`.
- La ejecución de tareas vive en el flujo del agente implementador, no aquí.
