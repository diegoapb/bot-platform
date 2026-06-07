# Skills

Capacidades reutilizables empaquetadas para que un agente las invoque. Cada skill es **una carpeta autocontenida** con su propia descripción, scripts y dependencias declaradas.

## Skills actuales

| Skill | Propósito |
|---|---|
| [`story-requirements`](./story-requirements/SKILL.md) | Crear/refinar `requirements.md` siguiendo la sintaxis EARS (Kiro). |
| [`story-design`](./story-design/SKILL.md) | Crear `design.md` (flujo Feature o Bugfix). |
| [`story-tasks`](./story-tasks/SKILL.md) | Crear `tasks.md` con tareas atómicas + grafo de waves. |

## Convención

```
skills/
└── <nombre-de-la-skill>/
    ├── SKILL.md        # propósito, cuándo invocarla, entradas/salidas
    ├── scripts/        # implementación (Node, Python, bash)
    └── examples/       # llamadas de ejemplo (opcional)
```

## Plantilla `SKILL.md`

```markdown
---
name: nombre-de-la-skill
description: una frase que diga cuándo usarla
inputs:
  - name: …
    type: string
    required: true
outputs:
  - …
---

## Cuándo usarla
…

## Cómo se invoca
…

## Ejemplo
```
```
