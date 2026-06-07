---
date: 2026-06-07
start: "14:50"
end: "15:35"
epic: SIN-EPICA
stories: []
agent: claude-opus-4-7
participants: [@diego]
tags: [spec-system, knowledge-base, sessions, hooks, skills]
---

# Organización del `_spec-system`: knowledge-base, sessions, hook y skill

## Resumen ejecutivo

- Se añadieron dos carpetas nuevas al `_spec-system/`: `knowledge-base/` (material crudo: artículos, links, papers, chats, notas, adjuntos) y `sessions/` (bitácora estructurada de cada sesión de trabajo).
- Se configuró un hook `SessionEnd` en `.claude/settings.json` que dispara `_spec-system/_system/hooks/session-end-report/run.sh` y vuelca la conversación literal a `sessions/YYYY-MM-DD/HHMM-RAW-{slug}.md` al cerrar Claude Code.
- Se creó la skill `/generate-report` en `.claude/skills/generate-report/SKILL.md` para producir el reporte estructurado (resumen, decisiones, pendientes) desde el contexto en memoria, antes de cerrar la sesión — como complemento del RAW que cae después.
- Sin código de producto tocado; toda la sesión fue meta/organización del sistema de especificación.
- Pendiente: el hook y la skill se activan en la **próxima** sesión de Claude Code (los registros se cargan al inicio).

## Contexto inicial

Arrancó con: *"Requiero agregar una carpeta al sistema, en esta carpeta tendremos una base de conocimiento extensa…"*. La intención era separar conocimiento crudo (artículos, papers, chats sin procesar) del conocimiento ya sintetizado que vive en `research/`. La conversación se fue ampliando hacia trazabilidad de sesiones, automatización vía hook, y consolidación vía skill.

## Épica y stories tocadas

- **Épica**: SIN-EPICA — la sesión es de infraestructura del propio `_spec-system/`, no toca ninguna épica de producto (E01 auth, E02 multitenancy, E03 super-admin, E04 onboarding-local-dev).
- **Stories**: ninguna.

## Decisiones tomadas

1. **`knowledge-base/` separada de `research/`** — `knowledge-base/` guarda material en bruto (con subcarpetas `articulos`, `links`, `papers`, `chats`, `notas`, `adjuntos`); `research/` mantiene su rol de conocimiento purgado con recomendación. Regla mental documentada: *"si tienes que leer y procesar algo antes de usarlo → knowledge-base; si ya hay conclusión con trade-offs → research"*.
2. **`sessions/YYYY-MM-DD/HHMM-{EPIC}-{titulo}.md`** — naming jerárquico por día y hora de inicio, con épica dominante embebida y `SIN-EPICA` como placeholder cuando no aplica. Reportes inmutables salvo correcciones o enlaces hacia adelante; una sesión = un archivo.
3. **Hook hace dump crudo, no resumen LLM** — al cierre de sesión solo se vuelca el JSONL del transcript a markdown (`HHMM-RAW-{slug}.md`). Descartado invocar `claude -p` desde el hook por costo recurrente; el resumen se hace por la skill bajo demanda. El RAW nunca se pierde aunque la skill no se invoque.
4. **`.claude/settings.json` (proyecto) en vez de `settings.local.json`** — el hook se commitea al repo para que aplique a cualquier persona/agente que trabaje el proyecto.
5. **Skill vive en `.claude/skills/`** — donde Claude Code la auto-descubre como slash command. `_spec-system/_system/skills/` mantiene su rol de **especificaciones**, y su README ahora distingue ambas ubicaciones en una tabla. Convención: cuando una skill debe ser invocable con `/nombre`, vive físicamente en `.claude/skills/` y se referencia desde la tabla de `_system/skills/`.
6. **`/generate-report` no busca el RAW** — corrección hecha sobre la marcha: la skill se invoca **antes** de cerrar la sesión, por lo que el archivo RAW aún no existe. El reporte estructurado se construye desde la conversación en contexto; el RAW caerá como archivo hermano cuando el hook dispare al cierre.

## Cambios en el repo

Archivos creados:
- `_spec-system/knowledge-base/README.md` + subcarpetas `articulos/`, `links/`, `papers/`, `chats/`, `notas/`, `adjuntos/` (cada una con `.gitkeep`).
- `_spec-system/sessions/README.md`.
- `_spec-system/_system/hooks/session-end-report/HOOK.md` — documentación del hook.
- `_spec-system/_system/hooks/session-end-report/run.sh` — script bash ejecutable que dumpea el transcript JSONL a markdown.
- `.claude/settings.json` — registra el hook `SessionEnd` (async, timeout 30s).
- `.claude/skills/generate-report/SKILL.md` — skill invocable como `/generate-report`.

Archivos modificados:
- `_spec-system/README.md` — añadidas `knowledge-base/` y `sessions/` al árbol y a las reglas del modelo.
- `_spec-system/_system/skills/README.md` — tabla de skills ampliada con columna "ubicación real" y entrada para `generate-report`.

Sin commits en esta sesión.

## Pendientes / próximos pasos

- [ ] Verificar en la próxima sesión que el hook `SessionEnd` realmente dispara y genera el RAW esperado (la carga de hooks ocurre al iniciar la sesión).
- [ ] Verificar en la próxima sesión que `/generate-report` aparece como slash command y que su descripción cacheada coincide con la versión actual del SKILL.md (esta sesión recibió la versión vieja al invocar la skill).
- [ ] Considerar capturar bloques `tool_use` y `thinking` del asistente en el RAW (hoy salen vacíos: solo se preserva texto). Pendiente decidir si vale la pena la verbosidad.
- [ ] Decidir convención para `tags` opcionales en frontmatter de sessions/ (cuando aparezcan más reportes, revisar si conviene un vocabulario controlado).
- [ ] Commitear los cambios del `_spec-system/` y `.claude/` (varios modificados sin stage).

## Bloqueos

Ninguno.

## Referencias

- Research consultada: ninguna.
- Knowledge base usado: ninguna.
- Issues / PRs externos: ninguno.
- **Conversación completa**: archivo hermano `HHMM-RAW-*.md` que generará el hook `SessionEnd` al cerrar la sesión (mismo directorio).
