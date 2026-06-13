# Recency Study Reproducibility

## Study Title

Commit-Touch Concentration Across Lifetime and Recent Repository History

## Recorded Environment

| Item | Value |
|---|---|
| Protocol file | `research/recency-study-protocol.md` |
| Protocol commit SHA | `935d91e0e5e8561a419e4a8b597156958208145e` |
| Tool commit SHA | `63ce922bb871d715f59c5abf0068b491b99d6bd8` |
| Tool version | `1.9.2` |
| Execution date range | `2026-06-13T08:25:50.950Z` through `2026-06-13T08:29:34.049Z` |
| Cutoff date | `2025-06-13T00:00:00Z` |
| Node version | `v24.13.1` |
| Git version | `git version 2.43.0` |

The execution date range is taken from the per-repository `metadata.json` files under `research/recency-study/runs/*/metadata.json`.

## Exact Commands Used

The study orchestration script was:

```bash
research/recency-study/run-all.sh research/recency-study/repositories.csv research/recency-study/runs
```

For each repository listed in `research/recency-study/repositories.csv`, the orchestration script ran:

```bash
node research/recency-calibration/scripts/run-recency-repo.js \
  --repo-path <repository_path> \
  --repo-name <repository_name> \
  --repo-sha <research_sha> \
  --cutoff-date 2025-06-13T00:00:00Z \
  --output-root research/recency-study/runs

node research/recency-calibration/scripts/parse-recency-results.js \
  --input-dir research/recency-study/runs/<repository_name>
```

The per-repository runner recorded these four commands in each `command-status.json` file:

```bash
node /home/sushantv/git-archaeologist/dist/index.js analyze <repository_path> --json

node /home/sushantv/git-archaeologist/dist/index.js analyze <repository_path> \
  --since 2025-06-13T00:00:00Z \
  --json

node /home/sushantv/git-archaeologist/dist/index.js risk <repository_path> --all

node /home/sushantv/git-archaeologist/dist/index.js risk <repository_path> \
  --all \
  --since 2025-06-13T00:00:00Z
```

After all repository runs were parsed, the orchestration script generated the aggregate outputs with:

```bash
node research/recency-study/aggregate-results.js research/recency-study/runs

node research/recency-study/summary-report.js research/recency-study/runs
```

The repository-level summary and manuscript outputs were then derived from the completed study artifacts without rerunning analyses:

```bash
research/recency-study/repository-summary.csv
research/recency-study/repository-summary.md
research/recency-study/paper.md
```

## Generated Outputs

Top-level study outputs:

| Output | Description |
|---|---|
| `research/recency-study/master-recency-study.json` | Aggregated machine-readable scope rows for all repositories. |
| `research/recency-study/master-recency-study.csv` | CSV form of the aggregated scope rows. |
| `research/recency-study/summary.md` | Overall coverage and category-count summary. |
| `research/recency-study/category-analysis.json` | Machine-readable category-level statistics. |
| `research/recency-study/category-analysis.md` | Category-level statistics report. |
| `research/recency-study/case-studies.md` | Historical and emerging concentration case-study scopes. |
| `research/recency-study/findings.md` | Observed study findings. |
| `research/recency-study/repository-summary.csv` | Repository-level category counts and percentages. |
| `research/recency-study/repository-summary.md` | Markdown form of repository-level summary. |
| `research/recency-study/paper.md` | Research-style paper generated from observed study outputs. |
| `research/recency-study/reproducibility.md` | This reproducibility record. |

Per-repository outputs are stored under `research/recency-study/runs/<repository_name>/`:

| Output | Description |
|---|---|
| `metadata.json` | Repository path, repository SHA, tool SHA, versions, execution date, and cutoff date. |
| `command-status.json` | Recorded analysis and risk commands with exit codes and output file names. |
| `checkout-status.json` | Checkout command status. |
| `restore-status.json` | Restore command status. |
| `lifetime-analysis.json` | Lifetime machine-readable analysis output. |
| `recent-analysis.json` | Recent-window machine-readable analysis output. |
| `lifetime-risk.txt` | Lifetime human-readable risk output. |
| `recent-risk.txt` | Recent-window human-readable risk output. |
| `lifetime-analysis-status.json` | Lifetime analysis command status. |
| `recent-analysis-status.json` | Recent analysis command status. |
| `lifetime-risk-status.json` | Lifetime risk command status. |
| `recent-risk-status.json` | Recent risk command status. |
| `lifetime-analysis.stderr.txt` | Lifetime analysis stderr capture. |
| `recent-analysis.stderr.txt` | Recent analysis stderr capture. |
| `lifetime-risk.stderr.txt` | Lifetime risk stderr capture. |
| `recent-risk.stderr.txt` | Recent risk stderr capture. |
| `recency-study.json` | Parsed scope rows for the repository. |
| `recency-study.csv` | CSV form of parsed repository scope rows. |

## Reproduction Procedure

1. Check out git-archaeologist at tool commit `63ce922bb871d715f59c5abf0068b491b99d6bd8`.
2. Use the protocol in `research/recency-study-protocol.md` as of protocol commit `935d91e0e5e8561a419e4a8b597156958208145e`.
3. Use Node `v24.13.1` and Git `2.43.0`.
4. Ensure each external repository listed in `research/recency-study/repositories.csv` is available at the recorded path or update the manifest paths while preserving the repository identifiers and research SHAs.
5. Run:

   ```bash
   research/recency-study/run-all.sh research/recency-study/repositories.csv research/recency-study/runs
   ```

6. Confirm that each `research/recency-study/runs/<repository_name>/command-status.json` records exit code `0` for `lifetime-analysis`, `recent-analysis`, `lifetime-risk`, and `recent-risk`.
7. Confirm that each `metadata.json` records cutoff date `2025-06-13T00:00:00Z`, tool SHA `63ce922bb871d715f59c5abf0068b491b99d6bd8`, Node `v24.13.1`, and Git `git version 2.43.0`.
8. Compare regenerated `master-recency-study.json`, `master-recency-study.csv`, `summary.md`, and per-repository `recency-study.json` / `recency-study.csv` files against the recorded outputs.
9. Regenerate downstream reports only from the completed study artifacts. Do not rerun repository analyses when producing `category-analysis.md`, `case-studies.md`, `findings.md`, `repository-summary.md`, or `paper.md`.
