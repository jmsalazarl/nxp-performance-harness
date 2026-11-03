#!/usr/bin/env bash
set -euo pipefail
export LC_ALL=C

output_file="${1:?Uso: collect-host-stats.sh <archivo.csv> [intervalo] [duracion]}"
interval="${2:-5}"
duration="${3:-0}"

command -v docker >/dev/null 2>&1 || {
  printf 'docker es requerido para recolectar estadisticas de contenedores\n' >&2
  exit 1
}

mkdir -p "$(dirname "$output_file")"
printf 'timestamp,host_cpu_user,host_cpu_system,host_cpu_idle,host_cpu_iowait,host_load_1m,host_load_5m,host_load_15m,host_memory_used_mib,host_memory_available_mib,host_swap_used_mib,host_swap_in,host_swap_out,container,container_cpu_percent,container_memory_usage,container_memory_percent,container_pids,container_status\n' > "$output_file"

read_host_cpu() {
  local cpu user nice system idle iowait irq softirq steal guest guest_nice
  read -r cpu user nice system idle iowait irq softirq steal guest guest_nice < /proc/stat
  printf '%s %s %s %s %s\n' "$user" "$system" "$idle" "$iowait" "$((user + nice + system + idle + iowait + irq + softirq + steal))"
}

read_host_memory() {
  awk '
    /^MemTotal:/ { total = $2 }
    /^MemAvailable:/ { available = $2 }
    /^SwapTotal:/ { swap_total = $2 }
    /^SwapFree:/ { swap_free = $2 }
    END {
      printf "%.2f %.2f %.2f\n", (total - available) / 1024, available / 1024, (swap_total - swap_free) / 1024
    }
  ' /proc/meminfo
}

read_host_load() {
  read -r load1 load5 load15 _ < /proc/loadavg
  printf '%s %s %s\n' "$load1" "$load5" "$load15"
}

read_swap_activity() {
  awk '/^pswpin / { swap_in = $2 } /^pswpout / { swap_out = $2 } END { printf "%s %s\n", swap_in + 0, swap_out + 0 }' /proc/vmstat
}

swap_rate() {
  local current="$1" previous="$2"
  awk -v current="$current" -v previous="$previous" -v interval="$interval" 'BEGIN {
    if (interval <= 0 || current < previous) {
      printf ""
    } else {
      printf "%.2f", (current - previous) / interval
    }
  }'
}

percent_delta() {
  local current="$1" previous="$2" current_total="$3" previous_total="$4"
  awk -v current="$current" -v previous="$previous" -v current_total="$current_total" -v previous_total="$previous_total" 'BEGIN {
    total = current_total - previous_total
    if (total <= 0) {
      printf ""
    } else {
      printf "%.2f", ((current - previous) / total) * 100
    }
  }'
}

declare -a target_containers=(
  "sut-api"
  "sut-web"
  "sut-db"
  "sut-storage"
)

if [[ -n "${DOCKER_CONTAINERS:-}" ]]; then
  read -r -a target_containers <<< "$DOCKER_CONTAINERS"
fi

k6_container="${K6_CONTAINER_NAME:-nxp-k6-capacity}"
target_containers+=("$k6_container")

declare -A seen_targets=()
declare -a unique_targets=()
for container in "${target_containers[@]}"; do
  if [[ -z "${seen_targets[$container]:-}" ]]; then
    seen_targets["$container"]=1
    unique_targets+=("$container")
  fi
done

read -r previous_user previous_system previous_idle previous_iowait previous_total < <(read_host_cpu)
read -r previous_swap_in previous_swap_out < <(read_swap_activity)
start="$SECONDS"

while true; do
  sleep "$interval"

  read -r current_user current_system current_idle current_iowait current_total < <(read_host_cpu)
  host_cpu_user="$(percent_delta "$current_user" "$previous_user" "$current_total" "$previous_total")"
  host_cpu_system="$(percent_delta "$current_system" "$previous_system" "$current_total" "$previous_total")"
  host_cpu_idle="$(percent_delta "$current_idle" "$previous_idle" "$current_total" "$previous_total")"
  host_cpu_iowait="$(percent_delta "$current_iowait" "$previous_iowait" "$current_total" "$previous_total")"
  read -r current_swap_in current_swap_out < <(read_swap_activity)
  host_swap_in="$(swap_rate "$current_swap_in" "$previous_swap_in")"
  host_swap_out="$(swap_rate "$current_swap_out" "$previous_swap_out")"
  read -r host_load_1m host_load_5m host_load_15m < <(read_host_load)
  read -r host_memory_used host_memory_available host_swap_used < <(read_host_memory)
  timestamp="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

  declare -A docker_rows=()
  while IFS='|' read -r name cpu memory memory_percent pids; do
    [[ -n "$name" ]] || continue
    docker_rows["$name"]="$cpu|$memory|$memory_percent|$pids"
  done < <(docker stats --no-stream --format '{{.Name}}|{{.CPUPerc}}|{{.MemUsage}}|{{.MemPerc}}|{{.PIDs}}' || true)

  for container in "${unique_targets[@]}"; do
    if [[ "$container" == "$k6_container" && -z "${docker_rows[$container]:-}" ]]; then
      printf '%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,,,,,NOT_DETECTED\n' \
        "$timestamp" "$host_cpu_user" "$host_cpu_system" "$host_cpu_idle" "$host_cpu_iowait" \
        "$host_load_1m" "$host_load_5m" "$host_load_15m" "$host_memory_used" "$host_memory_available" "$host_swap_used" "$host_swap_in" "$host_swap_out" "$container" >> "$output_file"
      continue
    fi

    if [[ -n "${docker_rows[$container]:-}" ]]; then
      IFS='|' read -r cpu memory memory_percent pids <<< "${docker_rows[$container]}"
      printf '%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,OK\n' \
        "$timestamp" "$host_cpu_user" "$host_cpu_system" "$host_cpu_idle" "$host_cpu_iowait" \
        "$host_load_1m" "$host_load_5m" "$host_load_15m" "$host_memory_used" "$host_memory_available" "$host_swap_used" "$host_swap_in" "$host_swap_out" \
        "$container" "$cpu" "$memory" "$memory_percent" "$pids" >> "$output_file"
    else
      status="MISSING"
      [[ "$container" == "$k6_container" ]] && status="NOT_DETECTED"
      printf '%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,,,,,%s\n' \
        "$timestamp" "$host_cpu_user" "$host_cpu_system" "$host_cpu_idle" "$host_cpu_iowait" \
        "$host_load_1m" "$host_load_5m" "$host_load_15m" "$host_memory_used" "$host_memory_available" "$host_swap_used" "$host_swap_in" "$host_swap_out" "$container" "$status" >> "$output_file"
    fi
  done

  previous_user="$current_user"
  previous_system="$current_system"
  previous_idle="$current_idle"
  previous_iowait="$current_iowait"
  previous_total="$current_total"
  previous_swap_in="$current_swap_in"
  previous_swap_out="$current_swap_out"

  if [[ "$duration" != "0" ]] && (( SECONDS - start >= duration )); then
    break
  fi
done
