#!/usr/bin/env bash
set -euo pipefail

STUDY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TOOL_ROOT="$(cd "$STUDY_DIR/../.." && pwd)"
REPOSITORIES_CSV="${1:-$STUDY_DIR/repositories.csv}"
OUTPUT_ROOT="${2:-$STUDY_DIR/runs}"
CUTOFF_DATE="2025-06-13T00:00:00Z"

RUNNER="$TOOL_ROOT/research/recency-calibration/scripts/run-recency-repo.js"
PARSER="$TOOL_ROOT/research/recency-calibration/scripts/parse-recency-results.js"

mkdir -p "$OUTPUT_ROOT"

if [[ ! -f "$REPOSITORIES_CSV" ]]; then
  echo "Repository manifest not found: $REPOSITORIES_CSV" >&2
  exit 1
fi

if [[ ! -f "$RUNNER" ]]; then
  echo "Calibration runner not found: $RUNNER" >&2
  exit 1
fi

if [[ ! -f "$PARSER" ]]; then
  echo "Calibration parser not found: $PARSER" >&2
  exit 1
fi

tail -n +2 "$REPOSITORIES_CSV" | while IFS=, read -r repository_name repository_path research_sha; do
  if [[ -z "${repository_name:-}" ]]; then
    continue
  fi

  repo_output_dir="$OUTPUT_ROOT/$repository_name"
  parsed_json="$repo_output_dir/recency-study.json"

  if [[ -f "$parsed_json" ]]; then
    echo "Skipping $repository_name; already processed at $parsed_json"
    continue
  fi

  if [[ "$repository_path" == /path/to/* ]]; then
    echo "Repository path placeholder must be replaced for $repository_name: $repository_path" >&2
    exit 1
  fi

  echo "Running recency study for $repository_name"
  node "$RUNNER" \
    --repo-path "$repository_path" \
    --repo-name "$repository_name" \
    --repo-sha "$research_sha" \
    --cutoff-date "$CUTOFF_DATE" \
    --output-root "$OUTPUT_ROOT"

  node "$PARSER" \
    --input-dir "$repo_output_dir"
done

node "$STUDY_DIR/aggregate-results.js" "$OUTPUT_ROOT"
node "$STUDY_DIR/summary-report.js" "$OUTPUT_ROOT"
