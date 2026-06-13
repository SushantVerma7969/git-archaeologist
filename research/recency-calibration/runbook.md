# Recency Calibration Runbook

## Inputs

- Express research SHA: `dae209ae6559c29cfca2a1f4414c51d89ea643d5`
- React research SHA: `900ae094d85b11c67d53dd14af50a2bda5db4495`
- Cutoff date: `2025-06-13T00:00:00Z`
- Tool repository: `/home/sushantv/git-archaeologist`

Set these paths before running commands:

```bash
export GIT_ARCH_REPO=/home/sushantv/git-archaeologist
export EXPRESS_REPO=/path/to/express
export REACT_REPO=/path/to/react
```

Build git-archaeologist once before collecting outputs:

```bash
cd "$GIT_ARCH_REPO"
npm run build
```

## Express Commands

Prepare the repository checkout:

```bash
git -C "$EXPRESS_REPO" fetch --all --tags
git -C "$EXPRESS_REPO" checkout dae209ae6559c29cfca2a1f4414c51d89ea643d5
git -C "$EXPRESS_REPO" rev-parse HEAD
git -C "$EXPRESS_REPO" status --short
```

Record metadata:

```bash
git -C "$EXPRESS_REPO" rev-parse HEAD > "$GIT_ARCH_REPO/research/recency-calibration/express/repository-sha.txt"
git -C "$GIT_ARCH_REPO" rev-parse HEAD > "$GIT_ARCH_REPO/research/recency-calibration/express/tool-sha.txt"
node --version > "$GIT_ARCH_REPO/research/recency-calibration/express/node-version.txt"
git --version > "$GIT_ARCH_REPO/research/recency-calibration/express/git-version.txt"
TZ=UTC date -u +"%Y-%m-%dT%H:%M:%SZ" > "$GIT_ARCH_REPO/research/recency-calibration/express/execution-date.txt"
printf "2025-06-13T00:00:00Z\n" > "$GIT_ARCH_REPO/research/recency-calibration/express/cutoff-date.txt"
```

Run lifetime analysis and save JSON output:

```bash
TZ=UTC LC_ALL=C node "$GIT_ARCH_REPO/dist/index.js" analyze "$EXPRESS_REPO" --json > "$GIT_ARCH_REPO/research/recency-calibration/express/lifetime-analysis.json"
```

Run recent analysis and save JSON output:

```bash
TZ=UTC LC_ALL=C node "$GIT_ARCH_REPO/dist/index.js" analyze "$EXPRESS_REPO" --since 2025-06-13T00:00:00Z --json > "$GIT_ARCH_REPO/research/recency-calibration/express/recent-analysis.json"
```

Save lifetime risk output:

```bash
TZ=UTC LC_ALL=C node "$GIT_ARCH_REPO/dist/index.js" risk "$EXPRESS_REPO" --all > "$GIT_ARCH_REPO/research/recency-calibration/express/lifetime-risk.txt"
```

Save recent risk output:

```bash
TZ=UTC LC_ALL=C node "$GIT_ARCH_REPO/dist/index.js" risk "$EXPRESS_REPO" --all --since 2025-06-13T00:00:00Z > "$GIT_ARCH_REPO/research/recency-calibration/express/recent-risk.txt"
```

## React Commands

Prepare the repository checkout:

```bash
git -C "$REACT_REPO" fetch --all --tags
git -C "$REACT_REPO" checkout 900ae094d85b11c67d53dd14af50a2bda5db4495
git -C "$REACT_REPO" rev-parse HEAD
git -C "$REACT_REPO" status --short
```

Record metadata:

```bash
git -C "$REACT_REPO" rev-parse HEAD > "$GIT_ARCH_REPO/research/recency-calibration/react/repository-sha.txt"
git -C "$GIT_ARCH_REPO" rev-parse HEAD > "$GIT_ARCH_REPO/research/recency-calibration/react/tool-sha.txt"
node --version > "$GIT_ARCH_REPO/research/recency-calibration/react/node-version.txt"
git --version > "$GIT_ARCH_REPO/research/recency-calibration/react/git-version.txt"
TZ=UTC date -u +"%Y-%m-%dT%H:%M:%SZ" > "$GIT_ARCH_REPO/research/recency-calibration/react/execution-date.txt"
printf "2025-06-13T00:00:00Z\n" > "$GIT_ARCH_REPO/research/recency-calibration/react/cutoff-date.txt"
```

Run lifetime analysis and save JSON output:

```bash
TZ=UTC LC_ALL=C node "$GIT_ARCH_REPO/dist/index.js" analyze "$REACT_REPO" --json > "$GIT_ARCH_REPO/research/recency-calibration/react/lifetime-analysis.json"
```

Run recent analysis and save JSON output:

```bash
TZ=UTC LC_ALL=C node "$GIT_ARCH_REPO/dist/index.js" analyze "$REACT_REPO" --since 2025-06-13T00:00:00Z --json > "$GIT_ARCH_REPO/research/recency-calibration/react/recent-analysis.json"
```

Save lifetime risk output:

```bash
TZ=UTC LC_ALL=C node "$GIT_ARCH_REPO/dist/index.js" risk "$REACT_REPO" --all > "$GIT_ARCH_REPO/research/recency-calibration/react/lifetime-risk.txt"
```

Save recent risk output:

```bash
TZ=UTC LC_ALL=C node "$GIT_ARCH_REPO/dist/index.js" risk "$REACT_REPO" --all --since 2025-06-13T00:00:00Z > "$GIT_ARCH_REPO/research/recency-calibration/react/recent-risk.txt"
```

## Expected Files Produced

For each repository directory, `express/` and `react/`, the calibration run
should produce:

- `repository-sha.txt`
- `tool-sha.txt`
- `node-version.txt`
- `git-version.txt`
- `execution-date.txt`
- `cutoff-date.txt`
- `lifetime-analysis.json`
- `recent-analysis.json`
- `lifetime-risk.txt`
- `recent-risk.txt`

## Validation Checklist

- Repository SHA matches the SHA listed in this runbook.
- Lifetime and recent runs use the same checked-out repository SHA.
- Cutoff date is exactly `2025-06-13T00:00:00Z`.
- `lifetime-analysis.json` and `recent-analysis.json` are valid JSON.
- Risk output files exist and are non-empty.
- Repository status is recorded and reviewed for local modifications.
- Tool SHA, Node version, Git version, execution date, and cutoff date are
  recorded.

## Manual Verification Checklist

- Confirm bots are absent from contributor rankings.
- Verify top-share arithmetic for one Express scope.
- Verify top-share arithmetic for one React scope.
- Confirm bus factor reaches the 50% touch threshold correctly for each
  manually checked scope.
- Confirm sparse recent activity is treated as insufficient recent evidence
  when recent non-bot touches are fewer than ten.
- Confirm Express and React produce meaningfully different comparison patterns.
- Note possible identity fragmentation without merging email identities.
