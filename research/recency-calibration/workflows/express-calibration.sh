#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 /path/to/express [output-root]" >&2
  exit 1
fi

REPO_PATH="$1"
OUTPUT_ROOT="${2:-research/recency-calibration/runs}"
CUTOFF_DATE="2025-06-13T00:00:00Z"
REPOSITORY_SHA="dae209ae6559c29cfca2a1f4414c51d89ea643d5"

node research/recency-calibration/scripts/run-recency-repo.js \
  --repo-path "$REPO_PATH" \
  --repo-name express \
  --repo-sha "$REPOSITORY_SHA" \
  --cutoff-date "$CUTOFF_DATE" \
  --output-root "$OUTPUT_ROOT"

node research/recency-calibration/scripts/parse-recency-results.js \
  --input-dir "$OUTPUT_ROOT/express"
