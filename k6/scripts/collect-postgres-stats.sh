#!/usr/bin/env bash
set -euo pipefail

output_file="${1:?Uso: collect-postgres-stats.sh <archivo.jsonl> [intervalo] [duracion] }"
interval="${2:-5}"
duration="${3:-0}"
mkdir -p "$(dirname "$output_file")"
: > "$output_file"
start="$(date +%s)"
while true; do
  timestamp="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  payload="$(psql -X -At -F ',' -c "SELECT count(*) FILTER (WHERE state = 'active'), count(*) FILTER (WHERE state = 'idle'), count(*) FILTER (WHERE wait_event IS NOT NULL) FROM pg_stat_activity" | tr -d '\n')"
  printf '{"timestamp":"%s","active_connections":%s,"idle_connections":%s,"waiting_sessions":%s}\n' "$timestamp" ${payload:-0,0,0} >> "$output_file"
  if [[ "$duration" != "0" ]] && (( $(date +%s) - start >= duration )); then break; fi
  sleep "$interval"
done
