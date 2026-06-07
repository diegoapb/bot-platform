# Hooks

Disparadores de ciclo de vida del repo o de un agente. Ejemplos típicos:

- `pre-commit` — lint/typecheck antes de cada commit.
- `post-merge` — instalar deps o regenerar `roadmap.md` tras un merge.
- `on-story-status-change` — disparado cuando cambia el `status` de una historia.

## Convención

```
hooks/
└── <evento>/
    ├── HOOK.md    # qué hace, cómo se conecta
    └── run.sh     # implementación (o .mjs, .py)
```

## Plantilla `HOOK.md`

```markdown
---
event: pre-commit
runner: bash        # bash | node | python
blocking: true      # si falla, ¿corta el flujo?
---

## Qué hace
…

## Cómo se instala
…
```

## Conexión

Cada hook documenta dónde se cablea: `.husky/`, `.git/hooks`, `settings.json` de Claude Code, GitHub Actions, etc. Esta carpeta es **solo la fuente**; el hook real apunta acá.
