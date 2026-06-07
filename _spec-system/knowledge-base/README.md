# Knowledge Base (conocimiento crudo)

Repositorio de **material en bruto** que sirve de insumo para definir épicas, alcances o decisiones técnicas. A diferencia de `research/` —donde el conocimiento ya está purgado, sintetizado y con una recomendación— aquí guardamos las fuentes tal cual: artículos, links, papers, transcripciones de chats, capturas, notas sueltas.

> Regla mental: si tienes que **leer y procesar** algo antes de poder usarlo → va aquí.
> Si ya tienes una conclusión con trade-offs y recomendación → va a `research/`.

## Cuándo guardar algo aquí

- Encontraste un artículo o post útil y no quieres perderlo.
- Te pasaron un PDF, paper o whitepaper relevante.
- Tuviste una conversación (con un colega, un cliente, un LLM) que vale conservar.
- Apuntes de una reunión, una llamada o una idea sin pulir.
- Snippets, ejemplos de código o configuraciones que viste por ahí.
- Capturas de pantalla, diagramas ajenos, imágenes de referencia.

## Organización

```
knowledge-base/
├── README.md
├── articulos/      # posts de blog, artículos, newsletters
├── links/          # bookmarks anotados (un .md por colección o tema)
├── papers/         # PDFs académicos o whitepapers
├── chats/          # transcripciones / exportaciones de conversaciones
├── notas/          # apuntes propios sin pulir, brainstorms, ideas
└── adjuntos/       # imágenes, capturas, diagramas, otros binarios
```

Si una carpeta queda chica, se puede subdividir por tema (`articulos/whatsapp/`, `papers/multitenancy/`, etc.). No fuerces estructura — crece según haga falta.

## Convención de nombre

`YYYY-MM-DD-slug.<ext>` — fecha de **captura** (no de publicación original) para que el orden cronológico funcione solo.

Ejemplos:
- `articulos/2026-06-07-baileys-rate-limits.md`
- `papers/2026-06-07-multi-tenant-saas-patterns.pdf`
- `chats/2026-06-07-charla-con-cliente-onboarding.md`
- `links/2026-06-07-recursos-clerk.md`

## Frontmatter (recomendado, no obligatorio)

Para archivos `.md`, un encabezado mínimo ayuda a recuperar después:

```yaml
---
date: 2026-06-07         # fecha de captura
title: Título descriptivo
source: https://...      # URL original si aplica
author: Nombre del autor original (no de quien guarda)
tags: [whatsapp, baileys]
captured-by: @diego      # quién lo trajo aquí
---
```

Para PDFs y binarios, crea un `.md` hermano con el mismo slug que contenga el frontmatter y un resumen de 2–3 líneas. Ej.: `papers/2026-06-07-foo.pdf` + `papers/2026-06-07-foo.md`.

## Plantilla para un link / artículo guardado

```markdown
---
date: 2026-06-07
title: ...
source: https://...
tags: [...]
captured-by: @diego
---

# {{título}}

**Por qué lo guardé:** _(1–2 líneas — qué problema o duda me hizo pensar en esto)_

## Resumen
_(opcional, 3–5 bullets si ya lo leíste)_

## Citas / fragmentos útiles
> ...

## Posible uso
_(épica, historia o decisión donde podría aplicar — sin compromiso)_
```

## Relación con `research/`

- Lo que vive aquí **alimenta** una investigación, pero no la reemplaza.
- Cuando un tema se vuelve decisión, se crea un doc en `research/` que **cita** las fuentes de `knowledge-base/` que se usaron.
- Una entrada de knowledge-base puede sobrevivir aunque la decisión cambie — sigue siendo material de consulta.

## Higiene

- No es un cementerio. Si algo lleva mucho tiempo sin tocarse y ya no aplica (cambio de stack, info obsoleta), bórralo o muévelo a un subdirectorio `_archivo/`.
- No subas material con restricciones de licencia o confidencialidad sin marcarlo claramente en el frontmatter (`license:` / `confidential: true`).
- No dupliques: si ya existe la fuente, agrégale notas en lugar de crear otra entrada.
