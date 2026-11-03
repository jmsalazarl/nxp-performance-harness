#!/usr/bin/env bash
set -euo pipefail

profile="${PROFILE:-smoke}"
base_url="${BASE_URL:-http://localhost:8080}"
run_stamp="$(date -u +%Y-%m-%dT%H-%M-%SZ)"
results_dir="${RESULTS_DIR:-results/reference/${run_stamp}-${profile}}"

mkdir -p "$results_dir"

k6 run \
  -e PROJECT=reference \
  -e PROFILE="$profile" \
  -e BASE_URL="$base_url" \
  -e RESULTS_DIR="$results_dir" \
  k6/projects/reference/main.js
