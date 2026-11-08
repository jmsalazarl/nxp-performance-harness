#!/usr/bin/env bash
set -Eeuo pipefail
export LC_ALL=C

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
project_id="${1:-}"
profile_file="${RESOURCE_PROFILES_FILE:-}"
role_map_file="${RESOURCE_ROLE_MAP_FILE:-}"
profile_ids="${RESOURCE_PROFILE_IDS:-constrained-a,constrained-b,constrained-c}"
results_root="${RESULTS_DIR:-results/${project_id}/resource-constrained}"
adapter_path="${ADAPTER_PATH:-}"
restore_script="${RESOURCE_RESTORE_SCRIPT:-}"
current_snapshot=""
restore_failed=0

if [[ -z "$project_id" || -z "$profile_file" || -z "$role_map_file" || -z "$adapter_path" ]]; then
  printf 'Faltan PROJECT, RESOURCE_PROFILES_FILE, RESOURCE_ROLE_MAP_FILE o ADAPTER_PATH\n' >&2
  exit 2
fi

command -v docker >/dev/null 2>&1 || { printf 'docker es requerido\n' >&2; exit 2; }
command -v node >/dev/null 2>&1 || { printf 'node es requerido\n' >&2; exit 2; }
[[ -f "$profile_file" ]] || { printf 'No existe el archivo de profiles: %s\n' "$profile_file" >&2; exit 2; }
[[ -f "$role_map_file" ]] || { printf 'No existe el role map privado: %s\n' "$role_map_file" >&2; exit 2; }
[[ -f "$adapter_path" ]] || { printf 'No existe el adapter privado: %s\n' "$adapter_path" >&2; exit 2; }

container_roles_json="$(cat "$role_map_file")"
observed_containers="$(node -e 'const fs=require("node:fs"); const value=JSON.parse(fs.readFileSync(process.argv[1],"utf8")); process.stdout.write(Object.values(value).join(" "))' "$role_map_file")"

docker info >/dev/null
mkdir -p "$results_root"

restore_current() {
  if [[ -z "$current_snapshot" ]]; then return 0; fi
  restore_args=(restore --profile "$profile_file" --role-map "$role_map_file" --snapshot "$current_snapshot")
  if [[ -n "$restore_script" ]]; then restore_args+=(--restore-script "$restore_script"); fi
  if ! node "$root_dir/scripts/docker-resource-profile.mjs" "${restore_args[@]}"; then
    restore_failed=1
    printf 'RESOURCE LIMITS RESTORED = NO\n' >&2
  else
    printf 'RESOURCE LIMITS RESTORED = YES\n'
  fi
  current_snapshot=""
}

cleanup() {
  local status="$?"
  trap - EXIT INT TERM
  restore_current || true
  if [[ "$restore_failed" -ne 0 ]]; then status=1; fi
  exit "$status"
}

trap cleanup EXIT
trap 'exit 130' INT TERM

IFS=',' read -r -a requested_profiles <<< "$profile_ids"
for profile_id in "${requested_profiles[@]}"; do
  profile_id="${profile_id//[[:space:]]/}"
  [[ -n "$profile_id" ]] || continue
  profile_results="${results_root}/${profile_id}"
  mkdir -p "$profile_results"
  snapshot_file="${profile_results}/resource-limits-original.json"
  node "$root_dir/scripts/docker-resource-profile.mjs" snapshot --profile "$profile_file" --role-map "$role_map_file" --profile-id "$profile_id" --snapshot "$snapshot_file"
  current_snapshot="$snapshot_file"
  node "$root_dir/scripts/docker-resource-profile.mjs" apply --profile "$profile_file" --role-map "$role_map_file" --profile-id "$profile_id" --snapshot "$current_snapshot"
  node "$root_dir/scripts/docker-resource-profile.mjs" verify --profile "$profile_file" --role-map "$role_map_file" --profile-id "$profile_id" --snapshot "$current_snapshot"

  node -e 'const fs=require("node:fs"); const p=JSON.parse(fs.readFileSync(process.argv[1],"utf8")); const s=JSON.parse(fs.readFileSync(process.argv[2],"utf8")); fs.writeFileSync(process.argv[3], JSON.stringify({schemaVersion:1, profileId:process.argv[4], kind:"laboratory", requested:p.profiles.find(x=>x.id===process.argv[4]), originalLimits:s, resourceLimitsRestored:false}, null, 2)+"\n")' "$profile_file" "$current_snapshot" "${profile_results}/resource-profile.json" "$profile_id"

  set +e
  PROJECT_ID="$project_id" \
  RESULTS_DIR="$profile_results" \
  RUN_ID="${project_id}-${profile_id}-capacity-stepped" \
  PROFILE="capacity-stepped" \
  ADAPTER_PATH="$adapter_path" \
  CONTAINER_ROLES_JSON="$container_roles_json" \
  DOCKER_CONTAINERS="$observed_containers" \
  CAPACITY_STEPS="${CAPACITY_STEPS:-20,40,80,120,160}" \
  CAPACITY_STEPPED_MEASUREMENT_DURATION="${CAPACITY_STEPPED_MEASUREMENT_DURATION:-3m}" \
  "$root_dir/nxp-performance" run "$project_id" capacity-stepped
  run_status=$?
  set -e

  restore_current
  if [[ "$restore_failed" -ne 0 ]]; then exit 1; fi
  node -e 'const fs=require("node:fs"); const f=process.argv[1]; const v=JSON.parse(fs.readFileSync(f,"utf8")); v.resourceLimitsRestored=true; fs.writeFileSync(f, JSON.stringify(v, null, 2)+"\n")' "${profile_results}/resource-profile.json"
  if [[ "$run_status" -ne 0 ]]; then
    printf 'Profile %s abortado con estado %s\n' "$profile_id" "$run_status" >&2
    exit "$run_status"
  fi
done

printf 'Todos los profiles constrained finalizaron con restore verificado.\n'
