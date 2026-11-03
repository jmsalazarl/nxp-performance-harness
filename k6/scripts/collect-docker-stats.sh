#!/usr/bin/env bash
set -euo pipefail

output_file="${1:?Uso: collect-docker-stats.sh <archivo.csv> [intervalo] [duracion] }"
interval="${2:-5}"
duration="${3:-0}"
containers="${DOCKER_CONTAINERS:-}"
mkdir -p "$(dirname "$output_file")"
printf 'timestamp,container,cpu_percent,memory_usage,memory_percent,net_io,block_io,pids\n' > "$output_file"
start="$(date +%s)"
while true; do
  timestamp="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  if [[ -n "$containers" ]]; then
    docker stats --no-stream --format "${timestamp},{{.Name}},{{.CPUPerc}},{{.MemUsage}},{{.MemPerc}},{{.NetIO}},{{.BlockIO}},{{.PIDs}}" $containers >> "$output_file"
  else
    docker stats --no-stream --format "${timestamp},{{.Name}},{{.CPUPerc}},{{.MemUsage}},{{.MemPerc}},{{.NetIO}},{{.BlockIO}},{{.PIDs}}" >> "$output_file"
  fi
  if [[ "$duration" != "0" ]] && (( $(date +%s) - start >= duration )); then break; fi
  sleep "$interval"
done
