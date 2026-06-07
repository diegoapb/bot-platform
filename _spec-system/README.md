# `_spec-system` — Especificación viva de bot-plataform

Carpeta única de verdad para **qué** estamos construyendo y **por qué**. El código vive en `apps/` e `infra/`; aquí vive el producto.

## Estructura

```
_spec-system/
├── prd.md
├── architecture.md
├── tech-stack.md
├── roadmap.md            # auto-generado por _system/scripts/roadmap.mjs
├── progress.md
├── epics/
│   ├── README.md
│   └── E0X-slug.md       # una épica = un archivo
├── stories/
│   ├── README.md
│   └── US-00X-slug/      # una historia = una carpeta con 4 docs
│       ├── index.md          # frontmatter maestro + índice + descripción corta
│       ├── requirements.md   # criterios de aceptación Gherkin
│       ├── design.md         # diagramas y specs técnicas
│       └── tasks.md          # tareas, commits, research consultada
├── cycles/
│   ├── README.md
│   └── C0X-slug.md       # ciclo (sprint) con fechas y stories inscritas
├── research/
│   ├── README.md
│   └── YYYY-MM-DD-slug.md   # investigación que apoya decisiones
├── knowledge-base/        # material crudo: artículos, links, papers, chats, notas
│   ├── README.md
│   ├── articulos/
│   ├── links/
│   ├── papers/
│   ├── chats/
│   ├── notas/
│   └── adjuntos/
├── sessions/              # bitácora: un reporte por sesión, con conversación incluida
│   ├── README.md
│   └── YYYY-MM-DD/
│       └── HHMM-{EPIC}-{titulo-sesion}.md
└── _system/              # automatización de la spec (ver _system/README.md)
    ├── skills/
    ├── hooks/
    ├── tools/
    └── scripts/
        ├── roadmap.mjs      # genera roadmap.md leyendo frontmatters
        └── dashboards.mjs   # inyecta tabla de historias en cada epic/cycle
```

## Reglas del modelo

- **Épicas ↔ Historias**: una historia pertenece a **exactamente una épica**. Una épica puede tener N historias.
- **Historia = carpeta con 4 documentos**:
  1. `index.md` — **frontmatter maestro** + índice + descripción corta. Es el único lugar donde se cambia el `status`.
  2. `requirements.md` — qué hay que entregar. Criterios de aceptación en **Gherkin** (`Dado / Cuando / Entonces`).
  3. `design.md` — cómo se construye. Diagramas, contratos, modelos de datos.
  4. `tasks.md` — desglose en tareas, con enlaces a commits y a research consultada.
- **Ciclos (sprints)**: rangos de tiempo en los que se inscriben Stories. Una historia pertenece a **un solo ciclo** (o a ninguno mientras está en backlog).
- **Research (investigaciones)**: documentos que apoyan la toma de decisiones al crear épicas o implementar código. Viven en `research/`. Pueden relacionarse con una épica, una historia, ambas, o ninguna.
- **Knowledge base (conocimiento crudo)**: material en bruto (artículos, links, papers, chats, notas) que alimenta a `research/` pero aún no está purgado ni sintetizado. Vive en `knowledge-base/`.
- **Sessions (bitácora)**: un reporte por sesión de trabajo en `sessions/YYYY-MM-DD/HHMM-{EPIC}-{titulo}.md`, con resumen, decisiones, cambios y la **conversación completa** transcrita para trazabilidad.
- **Roadmap**: documento auto-generado que recorre todos los frontmatters de historias e imprime estado, épica y ciclo.

## Frontmatter de Historia (`stories/US-00X-slug/index.md`)

```yaml
---
id: US-00X
title: Título corto
epic: E0X                 # única épica padre
cycle: C0X                # null si no está en un ciclo
status: Levantamiento de requerimientos
priority: P1              # P0 crítica · P1 alta · P2 normal · P3 baja
estimate: S               # XS · S · M · L · XL
owner: @diego
---
```

### Estados de Historia (lista cerrada)

En este orden son las transiciones esperadas:

1. `Levantamiento de requerimientos`
2. `Creación de diseño`
3. `Levantamiento de tareas`
4. `Pendiente desarrollo`
5. `En implementación`
6. `Pendiente de pruebas`
7. `Probada`
8. `En CA`
9. `En producción`

> Cualquier valor fuera de esta lista debe romper el script de roadmap (es un error).

## Frontmatter de Épica (`epics/E0X-slug.md`)

```yaml
---
id: E0X
title: Título de la épica
status: draft             # draft | ready | in-progress | done | cancelled
owner: @diego
---
```

## Frontmatter de Ciclo (`cycles/C0X-slug.md`)

```yaml
---
id: C0X
name: Nombre corto
start: 2026-06-10
end: 2026-06-24
goal: Frase con el objetivo del ciclo
---
```

## Frontmatter de Research (`research/YYYY-MM-DD-slug.md`)

```yaml
---
date: 2026-06-07
title: Título descriptivo
author: @diego           # o el nombre del agente
epic: E0X                # opcional — solo si apoya una épica concreta
story: US-00X            # opcional — solo si apoya una historia concreta
tags: [whatsapp, baileys, evaluacion]  # opcional
status: draft            # draft | final | obsoleto
---
```

## Convenciones de naming

- Épicas: `E01`, `E02`, … (cero a la izquierda hasta `E99`).
- Historias: `US-001`, `US-002`, … (tres dígitos).
- Ciclos: `C01`, `C02`, …
- Una vez asignado, **un ID no se reutiliza** aunque la entidad se cancele.
- Slugs en kebab-case y en español.
- Idioma de todo el contenido: español.

## Regenerar artefactos

```bash
# Roadmap global (tabla por ciclo, por épica, resumen por estado)
node _spec-system/_system/scripts/roadmap.mjs

# Dashboard dentro de cada epic/cycle (bloque DASHBOARD:START/END)
node _spec-system/_system/scripts/dashboards.mjs
```

El script falla si encuentra:
- una historia con `status` fuera de la lista cerrada,
- una historia con `epic` que no existe,
- una historia con `cycle` que no existe.
