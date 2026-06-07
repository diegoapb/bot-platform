# Tools

CLIs y utilidades específicas del proyecto. A diferencia de `skills/` (que un agente invoca), las **tools** las puede correr tanto un humano como un agente.

## Convención

```
tools/
└── <nombre-tool>/
    ├── TOOL.md    # uso, flags, ejemplos
    └── bin/       # entrypoint ejecutable
```

## Plantilla `TOOL.md`

```markdown
---
name: nombre-tool
runner: node       # node | python | bash
---

## Uso
```bash
./_system/tools/<nombre-tool>/bin/run [flags]
```

## Flags
- `--foo` …

## Ejemplo
```
```

## Cuándo NO va aquí

- Si solo lo usa un desarrollador a diario → `scripts/` de la raíz.
- Si solo lo invoca un agente → `_system/skills/`.
- Si genera artefactos del producto → vive con el código (`apps/`, `packages/`).
