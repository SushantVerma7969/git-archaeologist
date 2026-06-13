# Recency Study Automation

This directory contains research-only automation for the recency study. The
scripts call the existing `dist/index.js` CLI and parse saved outputs; they do
not change analyzers, risk logic, ownership logic, thresholds, or source code.

## Build the CLI

Build once before running calibration or study jobs:

```bash
npm run build
```

## Run One Repository

Use `run-recency-repo.js` to collect raw outputs and metadata for one
repository:

```bash
node research/recency-calibration/scripts/run-recency-repo.js \
  --repo-path /path/to/repo \
  --repo-name repository-name \
  --repo-sha repository-commit-sha \
  --cutoff-date 2025-06-13T00:00:00Z \
  --output-root research/recency-calibration/runs
```

The runner checks out the requested repository SHA, captures metadata, and
saves:

- `metadata.json`
- `checkout-status.json`
- `command-status.json`
- `lifetime-analysis.json`
- `recent-analysis.json`
- `lifetime-risk.txt`
- `recent-risk.txt`
- one stderr file and one status file per analysis command

## Parse One Repository

After a repository run completes, parse the raw JSON outputs:

```bash
node research/recency-calibration/scripts/parse-recency-results.js \
  --input-dir research/recency-calibration/runs/repository-name
```

The parser writes:

- `recency-study.json`
- `recency-study.csv`

The CSV and JSON rows follow the schema documented in
`research/recency-study-protocol.md`.

## Express Calibration

Express uses the calibration SHA from `research/README.md`:

```text
dae209ae6559c29cfca2a1f4414c51d89ea643d5
```

Run:

```bash
bash research/recency-calibration/workflows/express-calibration.sh /path/to/express
```

Expected output directory:

```text
research/recency-calibration/runs/express/
```

## React Calibration

React uses the calibration SHA from `research/README.md`:

```text
900ae094d85b11c67d53dd14af50a2bda5db4495
```

Run:

```bash
bash research/recency-calibration/workflows/react-calibration.sh /path/to/react
```

Expected output directory:

```text
research/recency-calibration/runs/react/
```

## Full 26-Repository Study

Do not start the full study until Express and React pass the calibration gate
in `research/recency-study-protocol.md`.

For each repository in `research/README.md`:

1. Check that the local repository path points to the intended project.
2. Use the repository SHA listed in `research/README.md`.
3. Run `run-recency-repo.js` with the stable repository name, path, SHA, and
   cutoff date.
4. Run `parse-recency-results.js` against the repository output directory.
5. Retain all raw JSON, risk text, metadata, stderr, and status files.
6. Review `git status --short` captured in `metadata.json` before accepting
   the result.

Example:

```bash
node research/recency-calibration/scripts/run-recency-repo.js \
  --repo-path /path/to/angular \
  --repo-name angular \
  --repo-sha 47d68dcb26266316647133ab6385e77fc3e5ae08 \
  --cutoff-date 2025-06-13T00:00:00Z \
  --output-root research/recency-calibration/runs

node research/recency-calibration/scripts/parse-recency-results.js \
  --input-dir research/recency-calibration/runs/angular
```

## Expected Outputs

Each repository directory should contain raw evidence:

- lifetime analyze JSON
- recent analyze JSON
- lifetime risk output
- recent risk output
- command statuses
- metadata

Each repository directory should also contain parsed study outputs:

- `recency-study.csv`
- `recency-study.json`

The parsed outputs include the protocol categories:

- `Persistent concentration`
- `Historical concentration`
- `Emerging concentration`
- `Persistently distributed`
- `No recent activity`
- `Insufficient recent evidence`

## Notes

- `No recent activity` is applied before `Insufficient recent evidence`.
- Recent scopes with one to nine non-bot file touches are classified as
  insufficient recent evidence.
- Email identities are not merged.
- Identity fragmentation is flagged only as contextual evidence.
