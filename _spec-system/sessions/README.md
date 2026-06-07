# Sessions (reportes de sesión)

Bitácora de **lo que pasó en cada sesión de trabajo** con un agente (o entre humanos). Cada reporte deja constancia de qué épica/historias se tocaron, qué decisiones se tomaron y conserva la conversación completa para trazabilidad.

> Objetivo: poder reconstruir el **por qué** detrás de cualquier avance — no solo el *qué* que ya queda en git.

## Cuándo generar un reporte

- **Al cerrar la sesión** (regla principal). El agente genera el reporte antes de despedirse.
- Si la sesión fue larga y cambió de tema, puede haber **varios reportes** del mismo día (uno por bloque temático).
- Si la sesión fue puramente exploratoria sin avance concreto, igual se guarda — la exploración también es trazabilidad.

## Estructura de carpetas

```
sessions/
├── README.md
└── YYYY-MM-DD/
    └── HHMM-{EPIC}-{titulo-de-la-sesion}.md
```

Ejemplo:

```
sessions/
├── 2026-06-07/
│   ├── 0930-E01-setup-clerk-multitenancy.md
│   ├── 1415-E02-diseno-flujo-baileys.md
│   └── 1830-SIN-EPICA-organizacion-spec-system.md
└── 2026-06-08/
    └── 1000-E03-onboarding-local-dev.md
```

### Reglas de naming

- **Carpeta del día**: `YYYY-MM-DD` (fecha local).
- **Archivo**: `HHMM-{EPIC}-{titulo-de-la-sesion}.md`
  - `HHMM` — hora de **inicio** de la sesión en formato 24h, sin separador (ej. `0930`, `1415`).
  - `{EPIC}` — id de la épica principal trabajada (`E01`, `E02`, …). Si la sesión no toca una épica concreta, usa `SIN-EPICA`. Si toca varias, usa la dominante.
  - `{titulo-de-la-sesion}` — slug en kebab-case, español, descriptivo y corto.

## Frontmatter

```yaml
---
date: 2026-06-07
start: "09:30"
end: "11:05"
epic: E01                          # épica dominante, o SIN-EPICA
stories: [US-001, US-002]          # historias tocadas (vacío si ninguna)
agent: claude-opus-4-7             # modelo/agente que condujo la sesión
participants: [@diego]             # humanos involucrados
tags: [clerk, multitenancy]        # opcional
---
```

## Estructura del reporte

```markdown
---
{{frontmatter}}
---

# {{Título de la sesión}}

## Resumen ejecutivo
_(3–5 bullets: qué se hizo, qué quedó pendiente, qué bloqueos hay)_

## Contexto inicial
_(con qué pregunta o tarea arrancó la sesión)_

## Épica y stories tocadas
- **Épica**: E01 — Autenticación Clerk
- **Stories**:
  - `US-001` — pasó de `Creación de diseño` → `Levantamiento de tareas`
  - `US-002` — se creó

## Decisiones tomadas
1. …
2. …

_(si alguna decisión amerita una research formal, enlazarla: `research/2026-06-07-…md`)_

## Cambios en el repo
- Archivos creados / modificados (resumen, no diff completo).
- Commits generados (hashes si aplica).

## Pendientes / próximos pasos
- [ ] …
- [ ] …

## Bloqueos
_(qué requiere input externo o decisión humana antes de avanzar)_

## Referencias
- Research consultada: `research/...`
- Knowledge base usado: `knowledge-base/...`
- Issues / PRs externos

---

## Conversación

_(transcripción completa de la sesión, en orden cronológico. Markdown con bloques `### Usuario` / `### Asistente`. Es la parte más larga del reporte y la que asegura trazabilidad real)._

### Usuario
…

### Asistente
…
```

## Buenas prácticas

- **No editar reportes pasados** salvo para corregir errores factuales o agregar enlaces hacia adelante (ej. _"esta decisión se revirtió en `sessions/2026-06-15/...`"_).
- **No mezclar reportes**: una sesión = un archivo. Si haces dos bloques de trabajo con descanso o cambio de tema, son dos reportes.
- **No usar reportes como fuente primaria de decisiones técnicas** — para eso está `research/`. El reporte cuenta lo que pasó; la research cuenta por qué algo es correcto.
- **Conversación literal**: no resumir el chat en la sección de conversación. El resumen va arriba; abajo va la transcripción real.
- **Si la conversación contiene secretos** (tokens, credenciales), redactarlos como `[REDACTED]` antes de guardar.

## Relación con el resto del sistema

- `epics/` y `stories/` describen el **plan**.
- `research/` describe el **por qué** de las decisiones.
- `knowledge-base/` guarda el **material crudo** que alimentó el por qué.
- `sessions/` registra **cuándo y cómo** se ejecutó cada paso del plan, con la conversación que lo produjo.
