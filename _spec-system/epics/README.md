# Épicas

Una **épica** es una unidad grande de valor que se descompone en historias. Una historia pertenece a **exactamente una** épica.

- Archivo: `E0X-slug.md` (uno por épica, no carpeta).
- El listado de historias asociadas se calcula leyendo el campo `epic:` de cada historia, no se mantiene a mano.

## Plantilla

```markdown
---
id: E0X
title: Título de la épica
status: draft        # draft | ready | in-progress | done | cancelled
owner: @diego
---

## Objetivo
_(¿qué cambia para el usuario cuando esto exista?)_

## Alcance
- Dentro: …
- Fuera: …

## Criterios de salida (definition of done de la épica)
- [ ] …
```
