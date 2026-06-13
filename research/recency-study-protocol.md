# Recency Study Protocol

## Goal

This study compares lifetime and recent maintenance concentration within
software repositories.

The goal is to distinguish scopes where historical change activity remains
concentrated from scopes where concentration has weakened, emerged recently,
or remained distributed.

The study measures commit-touch concentration. It does not measure code
ownership, expertise, or maintainership.

## Study Version

The study uses the current `main` branch of git-archaeologist. The exact
git-archaeologist commit, Node.js version, Git version, repository commit, and
execution date must be recorded for every run.

Each repository must use the same checked-out commit for its lifetime and
recent analyses. Where available, use the repository commit recorded in
`research/README.md`.

## Analysis Window

The fixed recent-period cutoff is:

```text
2025-06-13T00:00:00Z
```

The two comparison windows are:

- **Lifetime:** all history available from the checked-out repository snapshot.
- **Recent:** commits from `2025-06-13T00:00:00Z` through the checked-out
  repository snapshot.

An absolute UTC cutoff is used so the study does not depend on its execution
date or local timezone.

## Commands

Run both machine-readable analysis and human-readable risk output:

```bash
TZ=UTC LC_ALL=C node dist/index.js analyze <repo> --json
TZ=UTC LC_ALL=C node dist/index.js analyze <repo> \
  --since 2025-06-13T00:00:00Z --json

TZ=UTC LC_ALL=C node dist/index.js risk <repo> --all
TZ=UTC LC_ALL=C node dist/index.js risk <repo> \
  --all --since 2025-06-13T00:00:00Z
```

The JSON analysis is the canonical data source. The terminal risk output is
supporting evidence for review.

Also record:

```bash
git -C <repo> rev-parse HEAD
git -C <repo> status --short
node --version
git --version
git-arch --version
```

Do not use repository-wide commit-share output from the standalone
`ownership` command.

## Contributor Identities

Contributor identities are Git author email addresses.

- Calculations are keyed by email.
- Display names are presentation labels only.
- Different emails are not merged because their display names match.
- Shared names may therefore appear more than once in presented results.

This preserves the identity model used by the current analyzers and avoids
unsafe name-based canonicalization.

## Bot Filtering

Use the current bot filtering implemented by git-archaeologist.

Bot identities must be excluded before calculating contributor counts,
commit-touch concentration, and bus factor. The exact git-archaeologist commit
must be recorded because bot detection is heuristic and may change over time.

## Unit of Analysis

The primary unit of analysis is the top-level scope:

- Each top-level directory is a scope.
- Files at the repository root belong to the `(root)` scope.

Scope-level analysis is primary because repository-wide aggregation can hide
concentrated maintenance activity within individual modules.

Repository-level reporting may summarize the number and percentage of scopes
in each category. It must not introduce a repository-wide owner or commit-share
metric.

## Scope Metrics

For each eligible scope and analysis window:

```text
total_touches = sum of non-bot file-touch counts
top_share = largest identity touch count / total_touches
bus_factor = number of identities required to reach at least 50% of touches
```

A file touch means one analyzed commit touching one historical file path.

## Concentration Thresholds

Use the existing risk thresholds without adjustment:

- **HIGH**
  - Bus Factor is `1`, and
  - top contributor share is at least `80%`.

- **MEDIUM**
  - Bus Factor is `1`, or
  - Bus Factor is `2` and top contributor share is at least `50%`.

- **LOW**
  - All other eligible scopes.

For the recency study, `HIGH` and `MEDIUM` are considered concentrated.
`LOW` is considered distributed.

The current minimum scope size of three historical file paths remains in
effect.

Recent scopes with activity but fewer than ten non-bot file touches are
classified as insufficient recent evidence rather than concentrated or
distributed.

## Comparison Categories

Each scope receives exactly one comparison category:

### Persistent Concentration

The scope is concentrated in both the lifetime and recent windows.

### Historical Concentration

The scope is concentrated over its lifetime and distributed in the recent
window.

### Emerging Concentration

The scope is distributed over its lifetime and concentrated in the recent
window.

### Persistently Distributed

The scope is distributed in both the lifetime and recent windows.

### No Recent Activity

The scope exists in lifetime data but has no non-bot file touches in the recent
window.

### Insufficient Recent Evidence

The scope has recent non-bot activity but fewer than ten recent file touches.

The comparison rules are:

| Lifetime | Recent | Category |
|---|---|---|
| Concentrated | Concentrated | Persistent concentration |
| Concentrated | Distributed | Historical concentration |
| Distributed | Concentrated | Emerging concentration |
| Distributed | Distributed | Persistently distributed |
| Any | No touches | No recent activity |
| Any | Fewer than 10 touches | Insufficient recent evidence |

## Orthogonal Flags

The following flags provide context without changing a scope's category:

- `top_identity_changed`
- `bus_factor_changed`
- `risk_level_increased`
- `risk_level_decreased`
- `identity_fragmentation_suspected`

Identity fragmentation may be suspected when multiple email identities render
with the same or substantially similar display names. The identities must not
be merged during this study.

## Data Collection Schema

Store one row per repository and scope with these fields:

| Field | Description |
|---|---|
| `repository` | Stable research identifier |
| `repository_sha` | Analyzed repository commit |
| `tool_sha` | git-archaeologist commit used |
| `cutoff_utc` | Fixed recent-period cutoff |
| `scope` | Top-level directory or `(root)` |
| `lifetime_file_paths` | Historical paths represented in lifetime analysis |
| `recent_file_paths` | Historical paths represented in recent analysis |
| `lifetime_touches` | Lifetime non-bot file touches |
| `recent_touches` | Recent non-bot file touches |
| `lifetime_identities` | Distinct lifetime non-bot email identities |
| `recent_identities` | Distinct recent non-bot email identities |
| `lifetime_top_email` | Leading lifetime identity |
| `recent_top_email` | Leading recent identity |
| `lifetime_top_name` | Lifetime display name |
| `recent_top_name` | Recent display name |
| `lifetime_concentration` | Lifetime top contributor share |
| `recent_concentration` | Recent top contributor share |
| `lifetime_bus_factor` | Lifetime 50% touch threshold |
| `recent_bus_factor` | Recent 50% touch threshold |
| `lifetime_risk` | Lifetime HIGH, MEDIUM, or LOW classification |
| `recent_risk` | Recent HIGH, MEDIUM, or LOW classification |
| `category` | Lifetime-versus-recent comparison category |
| `top_identity_changed` | Whether the leading email identity changed |
| `bus_factor_changed` | Whether bus factor changed |
| `risk_level_increased` | Whether recent risk is higher |
| `risk_level_decreased` | Whether recent risk is lower |
| `identity_fragmentation_suspected` | Whether presentation suggests alias fragmentation |
| `notes` | Sparse evidence, bot-filter concerns, or other anomalies |

Retain the raw lifetime JSON, recent JSON, lifetime terminal output, recent
terminal output, command metadata, and exit status for every repository.

## Limitations

- Commit touches do not prove ownership, expertise, or maintainership.
- Historical paths may include deleted files.
- Renamed files may be represented as multiple paths.
- Multiple emails belonging to one person remain separate identities.
- Shared email addresses may combine more than one person.
- Bot filtering is heuristic and may miss project-specific automation.
- Large migrations, formatting changes, security sweeps, and generated updates
  can dominate file-touch counts.
- Recent windows contain less evidence and are naturally more volatile.
- Repository snapshots may end on different dates even though the cutoff is
  fixed.
- Top-level directories do not represent equivalent architectural units across
  repositories.
- Squash merges, rebases, and rewritten history affect attribution.
- The study describes maintenance-activity concentration within the available
  Git history, not organizational responsibility.

## Calibration Procedure

Calibrate the protocol with Express and React before running the full research
set.

Use the repository commits recorded in `research/README.md`:

```text
Express: dae209ae6559c29cfca2a1f4414c51d89ea643d5
React:   900ae094d85b11c67d53dd14af50a2bda5db4495
```

### Express

Express is the calibration case for historical concentration.

Expected behavior:

- At least one important scope shows lifetime concentration.
- Recent concentration weakens, disappears, or transitions to another
  contributor identity.
- Bot identities do not appear as leading contributors.
- Sparse recent activity is distinguished from distributed activity.

### React

React is the calibration case for distributed maintenance activity.

Expected behavior:

- Major scopes remain comparatively distributed.
- The shorter recent window does not create concentration solely because it has
  less evidence.
- Contributor identity counts and bus factor remain plausible under the email
  identity model.

### Acceptance Gate

Before analyzing the remaining repositories:

1. Confirm bots are absent from contributor rankings.
2. Manually verify top-share arithmetic for one scope in Express and one scope
   in React.
3. Confirm bus factor reaches the 50% threshold correctly.
4. Confirm Express and React produce meaningfully different comparison
   patterns.
5. Confirm raw outputs and run metadata are retained.
6. Freeze the protocol and thresholds before reviewing other repositories.
