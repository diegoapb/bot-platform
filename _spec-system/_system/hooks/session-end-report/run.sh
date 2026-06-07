#!/usr/bin/env bash
# SessionEnd hook: dumps the raw conversation to
#   _spec-system/sessions/YYYY-MM-DD/HHMM-RAW-{slug}.md
# Follows the naming convention from sessions/README.md.
# EPIC stays as "RAW" until the report is enriched (manually or by an agent).

set -uo pipefail

LOG="$(dirname "$0")/.last-error.log"
exec 2>>"$LOG"

INPUT="$(cat)"
TRANSCRIPT_PATH="$(echo "$INPUT" | jq -r '.transcript_path // empty')"
CWD="$(echo "$INPUT" | jq -r '.cwd // empty')"

if [[ -z "$TRANSCRIPT_PATH" || ! -f "$TRANSCRIPT_PATH" ]]; then
  echo "[$(date)] no transcript_path; skip" >&2
  exit 0
fi
if [[ -z "$CWD" || ! -d "$CWD/_spec-system/sessions" ]]; then
  echo "[$(date)] no sessions dir at $CWD; skip" >&2
  exit 0
fi

SESSIONS_DIR="$CWD/_spec-system/sessions"

# --- timestamp (first message, ISO-8601 like 2026-06-06T16:11:58.724Z) ---
FIRST_TS=$(jq -r 'select(.timestamp != null) | .timestamp' "$TRANSCRIPT_PATH" | head -n 1)
if [[ -n "$FIRST_TS" ]]; then
  ISO_NO_MS="${FIRST_TS%%.*}"
  ISO_NO_MS="${ISO_NO_MS%Z}"
  DAY=$(date -j -u -f "%Y-%m-%dT%H:%M:%S" "$ISO_NO_MS" "+%Y-%m-%d" 2>/dev/null) || DAY=""
  HHMM=$(date -j -u -f "%Y-%m-%dT%H:%M:%S" "$ISO_NO_MS" "+%H%M" 2>/dev/null) || HHMM=""
fi
DAY="${DAY:-$(date "+%Y-%m-%d")}"
HHMM="${HHMM:-$(date "+%H%M")}"

# --- slug from first real user prompt ---
FIRST_PROMPT=$(jq -r '
  select(.type=="user" and .message.role=="user")
  | (if (.message.content|type)=="string" then .message.content
     else (.message.content | map(select(.type=="text") | .text) | join(" ")) end)
' "$TRANSCRIPT_PATH" 2>/dev/null \
  | grep -v -E '^(<command-|<local-command-|Caveat:|<system-)' \
  | head -n 1)

SLUG=$(printf '%s' "${FIRST_PROMPT:-sesion}" \
  | tr '[:upper:]' '[:lower:]' \
  | LC_ALL=C sed -E 's/[^a-z0-9 ]+/ /g; s/[[:space:]]+/-/g; s/^-+|-+$//g' \
  | cut -c1-40 \
  | sed -E 's/-+$//')
SLUG="${SLUG:-sesion}"

OUT_DIR="$SESSIONS_DIR/$DAY"
OUT_FILE="$OUT_DIR/${HHMM}-RAW-${SLUG}.md"
mkdir -p "$OUT_DIR"

# If file exists (e.g., script re-ran), suffix with seconds to avoid clobber
if [[ -e "$OUT_FILE" ]]; then
  SUFFIX=$(date "+%S")
  OUT_FILE="$OUT_DIR/${HHMM}${SUFFIX}-RAW-${SLUG}.md"
fi

# --- build the markdown ---
{
  printf '%s\n' "---"
  printf 'date: %s\n' "$DAY"
  printf 'start: "%s:%s"\n' "${HHMM:0:2}" "${HHMM:2:2}"
  printf 'epic: RAW\n'
  printf 'stories: []\n'
  printf 'agent: claude-code\n'
  printf 'tags: [raw-dump]\n'
  printf 'status: por-enriquecer\n'
  printf '%s\n' "---"
  printf '\n# Sesión %s %s (volcado crudo)\n\n' "$DAY" "$HHMM"
  printf '> Reporte generado automáticamente por el hook `SessionEnd`. Pendiente de enriquecer con resumen, decisiones y trazabilidad (ver `_spec-system/sessions/README.md`).\n\n'
  printf '## Conversación\n\n'
  jq -r '
    if .type == "user" and (.message.role // "") == "user" then
      "### Usuario\n\n" + (
        if (.message.content|type)=="string" then .message.content
        else (.message.content | map(select(.type=="text") | .text) | join("\n"))
        end
      ) + "\n"
    elif .type == "assistant" then
      "### Asistente\n\n" + (
        ((.message.content // []) | map(select(.type=="text") | .text) | join("\n"))
      ) + "\n"
    else empty end
  ' "$TRANSCRIPT_PATH"
} > "$OUT_FILE"

echo "[$(date)] wrote $OUT_FILE" >&2
exit 0
