#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 /path/to/react [output-root]" >&2
  exit 1
fi

REPO_PATH="$1"
OUTPUT_ROOT="${2:-research/recency-calibration/runs}"
CUTOFF_DATE="2025-06-13T00:00:00Z"
REPOSITORY_SHA="900ae094d85b11c67d53dd14af50a2bda5db4495"

node research/recency-calibration/scripts/run-recency-repo.js \
  --repo-path "$REPO_PATH" \
  --repo-name react \
  --repo-sha "$REPOSITORY_SHA" \
  --cutoff-date "$CUTOFF_DATE" \
  --output-root "$OUTPUT_ROOT"

node research/recency-calibration/scripts/parse-recency-results.js \
  --input-dir "$OUTPUT_ROOT/react"
