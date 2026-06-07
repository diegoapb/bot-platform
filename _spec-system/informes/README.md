# Informes

Salidas generadas por agentes (investigación, revisiones, auditorías, pruebas) que aportan contexto a una historia.

- Un archivo por informe.
- Nombre: `YYYY-MM-DD-slug.md`.
- El frontmatter declara a qué historia se relaciona.
- En la historia correspondiente, `tasks.md` debe enlazar al informe.

## Plantilla

```markdown
---
date: 2026-06-07
story: US-00X
agent: nombre-del-agente
title: Título descriptivo del informe
---

## Contexto
_(por qué se generó este informe)_

## Hallazgos
- …

## Recomendaciones
- …

## Referencias
- …
```
