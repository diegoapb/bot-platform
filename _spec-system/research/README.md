# Research (investigaciones)

Documentos que **apoyan la toma de decisiones** al crear épicas o implementar código. Pueden ser exploraciones técnicas, benchmarks, comparativas de proveedores, lecturas de spec, auditorías o spikes.

Quien la genera (humano o agente) deja constancia de los hallazgos para que la siguiente persona que afronte un problema parecido no parta de cero.

## Cuándo escribir una investigación

- **Antes de una épica**: evaluar opciones (p. ej. "Baileys vs. WhatsApp Cloud API") para fundamentar la decisión de alcance.
- **Antes de una historia**: aclarar un detalle técnico clave (p. ej. "límites de rate de Evolution").
- **Durante implementación**: documentar trade-offs que descubriste sobre la marcha y vale la pena recordar.
- **Después de un incidente**: análisis de causa raíz que justifica un fix o una nueva historia.

## Convención de nombre

`YYYY-MM-DD-slug.md` — fecha primero para que el orden cronológico funcione solo.

## Frontmatter

Una investigación puede relacionarse con una épica, con una historia, con ambas, o con ninguna (research exploratoria).

```yaml
---
date: 2026-06-07
title: Título descriptivo
author: @diego           # o el nombre del agente
epic: E0X                # opcional
story: US-00X            # opcional
tags: [whatsapp, baileys, evaluacion]   # opcional
status: draft            # draft | final | obsoleto
---
```

Reglas:
- Si `epic` o `story` no aplican, simplemente omítelos.
- Una vez la decisión se materializa en una épica/historia, déjalo en `status: final`.
- Si el análisis ya no es válido (cambio de stack, proveedor, etc.), marca `status: obsoleto` con una nota arriba.

## Estructura recomendada

```markdown
---
date: 2026-06-07
title: ...
...
---

# Título

## Contexto / Pregunta
_(¿qué duda nos llevó a investigar?)_

## Hipótesis / Opciones evaluadas
1. Opción A — …
2. Opción B — …

## Hallazgos
- …

## Trade-offs
| Opción | Pros | Contras |
|---|---|---|
| A | … | … |
| B | … | … |

## Recomendación
_(qué deberíamos hacer, con justificación)_

## Decisión tomada
_(qué se decidió finalmente y dónde quedó plasmada — épica, historia, ADR)_

## Referencias
- Links externos, papers, PRs, threads.
```

## Trazabilidad

Cuando una research se referencia desde una historia, el `tasks.md` debe enlazarla:

```markdown
## Research consultada
- `research/2026-06-10-baileys-vs-cloud-api.md` — decidió uso de Baileys vía Evolution.
```
