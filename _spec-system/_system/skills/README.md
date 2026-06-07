# Skills

Capacidades reutilizables empaquetadas para que un agente las invoque. Cada skill es **una carpeta autocontenida** con su propia descripción, scripts y dependencias declaradas.

## Skills actuales

| Skill | Propósito | Ubicación real |
|---|---|---|
| [`story-requirements`](./story-requirements/SKILL.md) | Crear/refinar `requirements.md` siguiendo la sintaxis EARS (Kiro). | aquí |
| [`story-design`](./story-design/SKILL.md) | Crear `design.md` (flujo Feature o Bugfix). | aquí |
| [`story-tasks`](./story-tasks/SKILL.md) | Crear `tasks.md` con tareas atómicas + grafo de waves. | aquí |
| `generate-report` | Generar el reporte estructurado de la sesión actual en `sessions/`. Invocable como `/generate-report`. | `.claude/skills/generate-report/SKILL.md` |

> **Dos ubicaciones, una intención.** Las skills documentadas aquí (`_system/skills/`) son **especificaciones** del proyecto. Las skills que Claude Code descubre como slash commands viven en `.claude/skills/`. Cuando una skill debe ser invocable con `/nombre`, se coloca físicamente en `.claude/skills/` y se referencia desde esta tabla.

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
