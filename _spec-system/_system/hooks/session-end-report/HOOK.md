---
event: SessionEnd
runner: bash
blocking: false
async: true
---

## Qué hace

Cuando una sesión de Claude Code termina, vuelca la conversación completa a un archivo en `_spec-system/sessions/YYYY-MM-DD/HHMM-RAW-{slug}.md` siguiendo la convención de naming del README de `sessions/`.

- `EPIC` queda como `RAW` (placeholder): el reporte aún no ha sido enriquecido con resumen, decisiones, épica/stories tocadas.
- `slug` se deriva del primer prompt del usuario (kebab-case, máx. 40 chars).
- `HHMM` se toma del timestamp del primer mensaje (inicio real de la sesión).
- `date` (folder) idem.

El archivo generado contiene frontmatter mínimo + la conversación transcrita con secciones `### Usuario` / `### Asistente`. Status del frontmatter: `por-enriquecer`.

## Por qué "RAW" y no el reporte estructurado

Generar el reporte estructurado (resumen, decisiones, trazabilidad) requiere LLM. Hacerlo en cada `SessionEnd` cuesta tokens en cada sesión. Esta versión es barata y nunca pierde la conversación; el enriquecimiento se hace después (manualmente o por un agente que lea reportes con `status: por-enriquecer`).

## Cómo se instala

Configurado en `.claude/settings.json` del proyecto:

```json
{
  "hooks": {
    "SessionEnd": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bash _spec-system/_system/hooks/session-end-report/run.sh",
            "async": true,
            "timeout": 30
          }
        ]
      }
    ]
  }
}
```

## Requisitos

- `jq` disponible en `PATH`.
- macOS BSD `date` (el script usa `date -j -f`). En Linux habría que adaptar.

## Salida

- Crea `_spec-system/sessions/YYYY-MM-DD/HHMM-RAW-{slug}.md`.
- Nunca falla silenciosamente la sesión: el script siempre `exit 0`. Errores se loguean en `_spec-system/_system/hooks/session-end-report/.last-error.log`.

## Enriquecimiento posterior

Para convertir un reporte `RAW` en uno final:
1. Renombrar el archivo: cambiar `RAW` por la épica real (`E01`, `E02`, `SIN-EPICA`) y actualizar el slug.
2. Agregar al inicio el resumen, decisiones, cambios, pendientes, bloqueos y referencias (ver plantilla en `sessions/README.md`).
3. Cambiar `status: por-enriquecer` → quitar el campo o marcar `status: final`.
