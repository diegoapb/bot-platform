# `_spec-system/_system` — Automatización de la spec

Carpeta para todo lo que **opera sobre la spec** (épicas, historias, ciclos, informes) sin ser contenido de producto. Pensada para integraciones con agentes (Claude Code y similares) y mantenimiento del propio sistema de especificación.

## Estructura

```
_spec-system/_system/
├── skills/    # capacidades reutilizables que un agente puede invocar
├── hooks/     # disparadores de ciclo de vida (pre-commit, post-merge, …)
├── tools/     # CLIs específicas (humano o agente)
└── scripts/   # automatizaciones de mantenimiento de la spec
    ├── roadmap.mjs      # regenera _spec-system/roadmap.md
    └── dashboards.mjs   # actualiza bloque DASHBOARD:* en cada epic y cycle
```

## Diferencia entre subcarpetas

| Carpeta | Quién lo invoca | Ejemplo |
|---|---|---|
| `skills/` | un agente | "resumir el estado de la épica E01" |
| `hooks/` | un evento del repo | regenerar el roadmap tras un merge |
| `tools/` | humano **o** agente | CLI que valida frontmatters |
| `scripts/` | humano (o un hook) | `roadmap.mjs` |

> Regla rápida: si dudas, ¿lo decide un agente o ya está cableado a un evento? Si es lo primero → `skills/`. Si es lo segundo → `hooks/`. Si lo lanzas a mano → `scripts/` o `tools/`.

## Relación con otras carpetas del repo

- **`_spec-system/`** (padre) → qué construimos (producto).
- **`_spec-system/_system/`** (esta) → cómo mantenemos la spec.
- **`scripts/`** (raíz del repo) → scripts de desarrollo del producto (`dev-tunnel.sh`).
