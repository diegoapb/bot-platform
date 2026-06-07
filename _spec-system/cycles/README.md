# Ciclos (Sprints)

Un **ciclo** es un rango de tiempo en el que se inscriben Historias. Reglas:

- En un ciclo solo se inscriben **Stories** (nada de épicas sueltas ni tareas).
- Una Story puede estar en **un solo ciclo**.
- La pertenencia se declara desde la historia (`cycle: C0X` en su frontmatter), no se lista a mano en el ciclo.

## Plantilla — `C0X-slug.md`

```markdown
---
id: C0X
name: Nombre corto
start: 2026-06-10
end: 2026-06-24
goal: Frase con el objetivo del ciclo
---

## Objetivo
_(qué queremos demostrar al cerrar el ciclo)_

## Riesgos
- …

## Retrospectiva (al cerrar)
- Qué funcionó:
- Qué no:
- Acciones:
```

La lista de historias inscritas y su estado **vive en `roadmap.md`**, sección por ciclo, generada por el script.
