# git-archaeologist

[![npm](https://img.shields.io/npm/v/git-archaeologist?color=a78bfa&labelColor=1a1d27)](https://www.npmjs.com/package/git-archaeologist) [![CI](https://img.shields.io/github/actions/workflow/status/SushantVerma7969/git-archaeologist/ci.yml?branch=main&labelColor=1a1d27&color=a78bfa)](https://github.com/SushantVerma7969/git-archaeologist/actions/workflows/ci.yml) [![downloads](https://img.shields.io/npm/dm/git-archaeologist?color=a78bfa&labelColor=1a1d27)](https://www.npmjs.com/package/git-archaeologist) [![license](https://img.shields.io/badge/license-MIT-a78bfa?labelColor=1a1d27)](LICENSE) [![node](https://img.shields.io/badge/node-%3E%3D18-a78bfa?labelColor=1a1d27)](https://nodejs.org)

**Find maintenance risk in your git history before it turns into a handoff problem.**

git-archaeologist reads commit history and shows where maintenance knowledge is concentrated: which folders have a low bus factor, which contributor owns most of the history, and whether that contributor is still active. A directory that's 70% touched by someone who committed last week is different from one that's 70% touched by someone who hasn't committed in two years.

[Quick Start](#quick-start) · [Example output](#example-output) · [Concepts](#concepts) · [Commands](#commands) · [Research](RESEARCH.md) · [Benchmarks](BENCHMARKS.md)

---

## Quick Start

```bash
npx git-archaeologist risk .
```

Run it from the root of any git repository. No install required.

## Example output

```
$ npx git-archaeologist risk ./express

⛏  git-arch risk — express
  Maintenance risk map — not an ownership leaderboard
  Analysis window: all available history
──────────────────────────────────────────────────────────────────────

  HIGH RISK
  support
  Historical commit-touch concentration: 97.2%
  Bus Factor: 1
  Historical file paths: 18   Contributor identities: 4

  Top historical contributor: TJ Holowaychuk
  Latest analyzed activity: 12 years ago

  Why:
    * Bus factor is 1
    * Top contributor owns 97.2% of touches
  Interpretation:
    Knowledge remains concentrated in a single contributor.

    Historical concentration may not reflect current maintainership (12 years ago).

  MEDIUM RISK
  lib
  Historical commit-touch concentration: 75.9%
  Bus Factor: 1
  Top historical contributor: TJ Holowaychuk
  Latest analyzed activity: 12 years ago
```

> Numbers above are from a June 2026 run against the full history of `expressjs/express`; reproduce with `npx git-archaeologist risk .` on any clone. Exact figures shift as history grows.

## Why owner activity matters

We ran `git-arch risk` on two well-known projects and found similar concentration numbers — with completely different stories underneath.

**Express — `support/`**
- 97.2% of changes attributed to one contributor (TJ Holowaychuk, the original author)
- 389 contributors total across the repo
- That contributor's most recent commit anywhere in the repo was **12 years ago**
- Express has since moved under the OpenJS Foundation and is maintained by other people — but the *historical* concentration in this area still sits with someone long gone

**React — a core reconciler scope**
- 63.6% of changes attributed to one contributor (Andrew Clark)
- Bus factor 1, similar single-owner concentration
- That contributor committed **2 months ago** and is still active

Both are bus-factor-1, single-owner scopes. One owner has been gone for over a decade; the other is committing this quarter. The concentration number alone can't tell you which — owner activity is what separates *abandoned* concentration from *active* concentration, and it's the distinction this tool is built around.

> Figures from a June 2026 run against the full history of each repo. Reproduce with `git-arch risk <repo> --all`. They will drift over time — that drift is the point.

## Concepts

**Ownership Concentration** — percent of a folder's commit touches from its biggest contributor. High concentration is not inherently bad; it depends on recency and redundancy.

**Bus Factor** — computed per folder, not only per repo. A repo-wide bus factor of 5 can still hide a critical module with bus factor 1.

**Owner Activity** — when the dominant contributor last committed anywhere in the repo. This separates active concentration from abandoned concentration.

**HIGH / MEDIUM / LOW** — classified from ownership concentration and bus factor. Owner activity is shown as context so you can tell active concentration from abandoned concentration. Run `--all` to see every scope.

**Explainable Risk Output** — `git-arch risk` explains each scope with structured reasons and a short interpretation. The explanations reuse the same bus-factor and concentration values used by the risk command; they do not run additional analysis or change the thresholds.

## Temporal classification

`git-arch risk --temporal` compares lifetime risk with the last 12 months. This helps separate old concentration that has spread out from new concentration that is only visible recently.

- **Persistent concentration** — concentrated over lifetime history and still concentrated recently
- **Historical concentration** — concentrated over lifetime history, but distributed recently
- **Emerging concentration** — distributed over lifetime history, but concentrated recently
- **Persistently distributed** — distributed in both windows
- **No recent activity** — lifetime history exists, but there are no recent non-bot touches
- **Insufficient recent evidence** — fewer than 10 recent non-bot touches

For this comparison, HIGH and MEDIUM are treated as concentrated; LOW is treated as distributed.

## Hotspots

`git-arch risk --hotspots` ranks scopes by how many independent maintenance-risk signals fired for them: bus factor of 1, high contributor churn, an inactive dominant contributor, recently rising concentration, and ownership transitions. It does not invent a new weighted score — each fired signal carries its own evidence line, and scopes are ranked by signal count (concentration breaks ties). A scope where four independent signals agree is a stronger investigation candidate than one where only a single number looks high.

By default it shows scopes with two or more signals; `--all` lowers that to one, and `--json` emits machine-readable output. As with every other view, these are investigation signals, not claims about ownership or maintainership.

## Known Limitations

- Commit authorship is not the same as knowledge ownership.
- Multiple Git identities may affect ownership calculations.
- PR reviews and approvals are not currently analyzed.
- Results should be used as investigation signals, not final judgments.

## Install

For repeated use:

```bash
npm install -g git-archaeologist
```

## Commands

Maintenance risk:

```bash
git-arch risk /path/to/repo                    # ownership, bus factor, and owner activity
git-arch risk /path/to/repo --all              # include LOW risk scopes
git-arch risk /path/to/repo --temporal         # compare lifetime vs last 12 months
git-arch risk /path/to/repo --hotspots         # rank scopes by how many risk signals fired
git-arch ownership /path/to/repo               # folder ownership and bus factor
```

History analysis:

```bash
git-arch analyze /path/to/repo                 # curse scores, coupling, and ownership
git-arch analyze /path/to/repo --since 90d     # analyze commits from the last 90 days
git-arch analyze /path/to/repo --since 2y      # analyze commits from the last 2 years
git-arch analyze /path/to/repo --html          # generate an interactive HTML report
git-arch analyze /path/to/repo --json          # write JSON for scripts or other tools
git-arch cursed --top 10                       # show the top risky files
git-arch trend /path/to/repo                   # show files getting riskier over time
```

File and PR checks:

```bash
git-arch blame lib/response.js /path/to/repo   # explain risk for one file
git-arch blast lib/response.js /path/to/repo   # show files coupled to this file
git-arch pr-risk /path/to/repo                 # score local changes before pushing
```

## Deeper analysis: curse score & coupling

`git-arch analyze` goes beyond the risk map — it ranks individual files by **curse score** (a combination of recency, author churn, and acceleration) and detects **implicit coupling** (files that always change together despite no code-level connection).

```
$ git-arch analyze ./express

✔ Analysis complete — 902 files scanned

CURSE SCORE — top files by instability
  1. lib/response.js      score 23507   80 authors   392 changes
  2. lib/application.js   score  7356   41 authors   180 changes
  3. lib/request.js       score  6207   26 authors   176 changes

IMPLICIT COUPLING
  lib/response.js ↔ test/res.send.js   co-changes: 31
```

> Curse scores are a within-repo ranking, not an absolute scale — a score of 23,507 is only meaningful relative to other files in the same repository. Numbers from a June 2026 run; reproduce with `git-arch analyze .`.

> Run time: Express (~900 files) under 1 second · large repos like Kubernetes (~100k files) a few minutes. Most of the cost is `git log`; the analysis itself is linear in commits.

## How scoring works

```
curse_score = changes x log2(authors+1) x exp(-0.5 x age_years) x log2(churn_rate+2) x acceleration
```

The exponential decay on age means old chaos that stabilized doesn't show up. The acceleration multiplier means files getting worse recently score higher than ones with similar totals that have stabilized. Changelogs, lockfiles, and CI config are automatically excluded.

## Why not `git log` or ownership-only tools?

`git log` tells you what happened. Ownership-only tools tell you who touched code most. `git-archaeologist` adds bus factor, owner activity, temporal classification, and file-level history signals.

- Finds bus-factor-1 modules automatically across every folder
- Pairs ownership concentration with owner activity to distinguish healthy concentration from abandonment
- Surfaces files becoming more dangerous over time
- Discovers hidden coupling through commit co-occurrence
- Generates interactive HTML reports for large repositories

## MCP server (for AI agents)

git-archaeologist ships an [MCP](https://modelcontextprotocol.io) server, so an AI coding agent can query a repository's history directly instead of parsing CLI output. Start it over stdio:

```bash
git-arch mcp
```

It exposes five tools, each returning structured JSON:

- **`analyze_repo`** — overview: commit/contributor totals, bus-factor-1 scopes, top cursed files, merged identities
- **`who_owns`** — who has historically owned a specific file, and how recently they were active
- **`get_bus_factor`** — per-folder single-point-of-failure map
- **`find_coupled_files`** — files that have historically changed together
- **`get_risk_hotspots`** — scopes where multiple independent risk signals agree

All tools take an optional `repoPath` (defaulting to the working directory). Example client configuration:

```json
{
  "mcpServers": {
    "git-archaeologist": {
      "command": "npx",
      "args": ["git-archaeologist", "mcp"]
    }
  }
}
```

As with the CLI, these are investigation signals from commit history — not conclusions about ownership or who should be assigned work.

## GitHub Action (advanced)

For automatic curse-score analysis on every push or PR. The Action does not currently report `git-arch risk` owner-activity or temporal-risk findings.

```yaml
# .github/workflows/git-archaeologist.yml
name: Git Archaeologist
on:
  push:
    branches: [main, master]
  pull_request:

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: SushantVerma7969/git-archaeologist@v1
        with:
          top: 10
          since: 1y
          fail-on-curse-score: 0
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

`fetch-depth: 0` is required — without full history the analysis is incomplete. The Action reports curse-score findings for risky files; risk/owner-activity reporting is CLI-only for now.

## Research & Validation

### Does curse score predict bugs?

In a small manual check, the top curse-scored files in Express, React, and Vue were consistently files with heavy public bug-and-fix history. This is a hand-checked correlation on a handful of files, not a controlled study — the curse score is best understood as flagging files that are *socially complex enough that bugs tend to hide there*, not as a bug predictor. The [validation write-up](RESEARCH.md) details the method and its limitations.

- [Curse Score Validation Notes](RESEARCH.md) — method, results, and why this is correlation not prediction
- [Repository Risk Benchmark 2026](BENCHMARKS.md) — multi-repo analysis of bus-factor-1 modules

### Full Research

Extensive analysis of git history patterns, temporal ownership dynamics, and methodology:

- [Recency Study Phase 1](research/recency-study/) — Temporal risk classification across 25+ repositories
- [Raw Analysis Data](research/) — Complete git-arch outputs for 25 major OSS projects (JSON + CSV)
- [Study Protocol](research/recency-study-protocol.md) — Reproducible methodology and limitations
- [Methodology Audit](research/ownership-metric-audit.md) — Known issues and potential biases

## Requirements

Node.js >= 18 and git >= 2.30. Works on Linux, macOS, and Windows (WSL).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for:
- Development setup (clone, build, test)
- Code structure overview
- How to make changes and submit PRs
- Testing standards
- Research contribution guidelines

Quick start:
```bash
git clone https://github.com/SushantVerma7969/git-archaeologist.git
cd git-archaeologist
npm install && npm run build
npm test
```

## License

[MIT](LICENSE)
