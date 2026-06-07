---
name: generate-report
description: Generar el reporte estructurado de la sesión actual en _spec-system/sessions/YYYY-MM-DD/HHMM-{EPIC}-{titulo}.md siguiendo la convención del README de sessions/. El reporte resume lo trabajado (épica, stories, decisiones, cambios, pendientes) — se genera mientras la sesión sigue viva, usando la conversación en contexto. El volcado crudo de la conversación lo produce después el hook SessionEnd como archivo hermano. Invocar con /generate-report antes de cerrar el chat.
---

# generate-report

Genera el **reporte estructurado** de la sesión actual en `_spec-system/sessions/`. Funciona como **resumen ejecutivo en caliente**: se invoca antes de cerrar el chat, mientras la conversación aún vive en el contexto del agente.

El volcado crudo de la conversación lo produce **después** el hook `SessionEnd` automáticamente, como archivo hermano (`HHMM-RAW-*.md`). Esta skill **no depende** de ese RAW — lo precede.

## Cuándo se invoca

- El usuario escribe `/generate-report`, típicamente justo **antes** de cerrar Claude Code.
- En ese momento la sesión sigue viva y el RAW aún no existe — por eso este reporte se construye desde la conversación en contexto, no desde disco.

## Inputs

Ninguno. Todo el contexto proviene de la conversación actual y del estado del repo.

## Outputs

Un único archivo:

```
_spec-system/sessions/YYYY-MM-DD/HHMM-{EPIC}-{titulo-de-la-sesion}.md
```

## Pasos a ejecutar

1. **Lee primero la convención.** Read `_spec-system/sessions/README.md`. Es la fuente de verdad del frontmatter, estructura del reporte y reglas de naming. Si hay conflicto entre este SKILL y ese README, **gana el README**.

2. **Determina los componentes del nombre:**
   - `YYYY-MM-DD` — fecha de **hoy** (zona horaria local).
   - `HHMM` — hora de **inicio** de la sesión actual. Si no la conoces con precisión, usa la hora del **primer mensaje del usuario** que recuerdes en este chat; si tampoco, usa la hora actual y déjalo claro en el frontmatter.
   - `{EPIC}` — épica **dominante** que se trabajó. Mírate los archivos tocados, los IDs mencionados (`E01`, `E02`, …), y lo discutido. Si la sesión no toca épica concreta, usa `SIN-EPICA`. Si toca varias, elige la dominante y lista las otras en el cuerpo.
   - `{titulo-de-la-sesion}` — slug en kebab-case, español, corto (≤40 chars), descriptivo de la tarea principal de la sesión.

3. **Rellena la plantilla** (basada en el README de sessions/, sin duplicar la conversación literal):

   ```markdown
   ---
   date: YYYY-MM-DD
   start: "HH:MM"
   end: "HH:MM"
   epic: E0X                    # o SIN-EPICA
   stories: [US-00X, US-00Y]    # vacío si ninguna
   agent: claude-opus-4-7       # modelo que condujo la sesión
   participants: [@diego]
   tags: [..., ...]             # opcional
   ---

   # {Título de la sesión}

   ## Resumen ejecutivo
   - 3–5 bullets: qué se hizo, qué quedó pendiente, qué bloqueos hay.

   ## Contexto inicial
   _(con qué pregunta o tarea arrancó la sesión)_

   ## Épica y stories tocadas
   - **Épica**: E0X — {nombre}
   - **Stories**:
     - `US-00X` — {qué pasó con ella en esta sesión: se creó, cambió de estado, se diseñó, etc.}

   ## Decisiones tomadas
   1. {decisión} — {1 línea de justificación}
   2. …

   _(Si alguna amerita research formal, enlazarla: `research/YYYY-MM-DD-...md`.)_

   ## Cambios en el repo
   - Archivos creados / modificados (resumen, no diff completo).
   - Commits generados con hash si los hay.

   ## Pendientes / próximos pasos
   - [ ] …
   - [ ] …

   ## Bloqueos
   _(qué requiere input externo o decisión humana antes de avanzar; "Ninguno" si no hay)_

   ## Referencias
   - Research consultada: `research/...`
   - Knowledge base usado: `knowledge-base/...`
   - Issues / PRs externos
   - **Conversación completa**: archivo hermano `HHMM-RAW-*.md` que generará el hook `SessionEnd` al cerrar la sesión (mismo directorio).
   ```

4. **Crea la carpeta del día si no existe** y escribe el archivo con Write. Si ya existe un archivo con ese nombre (otro reporte de la misma franja), sufija con `-v2`, `-v3`, etc.

5. **Confirma al usuario** con la ruta del archivo creado y un resumen de 1 línea de lo que registraste. Recuérdale que el volcado crudo de la conversación aparecerá en la misma carpeta cuando cierre la sesión.

## Reglas duras

- **Nunca dupliques la conversación literal** en el reporte. Es un resumen, no una transcripción. El RAW lo genera el hook después.
- **Nunca inventes commits, archivos o decisiones** que no ocurrieron en esta sesión. Si no estás seguro, escríbelo como pregunta abierta en "Bloqueos" o "Pendientes".
- **Secretos** (tokens, credenciales, IPs internas) → `[REDACTED]`.
- **Si la sesión no produjo nada concreto** (solo exploración), igual genera el reporte — la exploración también es trazabilidad. El resumen lo dirá honestamente.
- El frontmatter debe ser YAML válido.

## Ejemplo de invocación

Usuario: `/generate-report` (justo antes de cerrar el chat)

Asistente:
1. Lee `_spec-system/sessions/README.md`.
2. Analiza la conversación en contexto: identifica que no se tocó épica concreta, hora de inicio ~14:30, tema dominante "organización del spec-system".
3. Crea `_spec-system/sessions/2026-06-07/1430-SIN-EPICA-organizacion-spec-system.md` con resumen, decisiones (creación de `knowledge-base/`, `sessions/`, hook SessionEnd, skill generate-report), pendientes y bloqueos.
4. Responde: "Reporte generado en `_spec-system/sessions/2026-06-07/1430-SIN-EPICA-organizacion-spec-system.md`. El volcado crudo aparecerá como `1430-RAW-*.md` en la misma carpeta cuando cierres la sesión."
