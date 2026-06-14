# git-archaeologist

[![npm](https://img.shields.io/npm/v/git-archaeologist?color=a78bfa&labelColor=1a1d27)](https://www.npmjs.com/package/git-archaeologist) [![license](https://img.shields.io/badge/license-MIT-a78bfa?labelColor=1a1d27)](LICENSE) [![node](https://img.shields.io/badge/node-%3E%3D18-a78bfa?labelColor=1a1d27)](https://nodejs.org)

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
$ npx git-archaeologist risk .

⛏  git-arch risk — express
Maintenance risk map — not an ownership leaderboard
──────────────────────────────────────────────────────────────────────
HIGH RISK
lib
Bus Factor: 1   Ownership Concentration: 100%   Contributors: 12   Files: 24
Owner: Douglas Christopher Wilson   Last active: 14 months ago

Why:
  * Bus factor is 1
  * Top contributor owns 100% of touches

Interpretation:
  Knowledge remains concentrated in a single contributor.

MEDIUM RISK
api
Bus Factor: 1   Ownership Concentration: 65.3%   Contributors: 9   Files: 31
Owner: Douglas Christopher Wilson   Last active: 6 days ago

Why:
  * Bus factor is 1
  * Top contributor owns 65.3% of touches

Interpretation:
  One contributor still accounts for enough history to create continuity risk.
```

## Why owner activity matters

We ran `git-arch risk` on two well-known projects and found nearly identical ownership numbers — with completely different stories underneath.

**Express.js — `lib/`**
- 65.3% of changes attributed to one long-time contributor
- 91 contributors total
- That contributor hasn't committed anywhere in the repo for **2 years**
- In the last 6 months, 5 different people made exactly 1 commit each — no clear successor

**Vue 3 — `packages/`**
- 70.7% of changes attributed to Evan You
- 384 contributors total
- Evan You committed **4 months ago**

Same concentration, roughly 65–70%. One has no single contributor with sustained recent involvement; the other has its original dominant contributor still committing. The number alone can't tell you which.

**State of OSS Maintainability 2026** — notes from running git-archaeologist across major OSS repositories. [Read the full report](https://sushantverma7969.github.io/git-archaeologist/)

See also: [Research data](RESEARCH.md) · [Benchmarks](BENCHMARKS.md)

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

## Known limitations

- Commit authorship ≠ knowledge ownership. Someone can deeply understand code they rarely commit to.
- Contributors using multiple Git emails may appear as separate identities, which can affect ownership concentration and bus-factor calculations.
- Owner activity helps here, but it only sees commits, not reviews, PR approvals, or informal triage.
- Squash merges can distort concentration scores.
- PR reviewers and approvers are not currently considered (see Roadmap).
- Git history is one signal among several — use it as a starting point for questions, not a final verdict.

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

✔ Analysis complete — 312 files scanned

CURSE SCORE — top files by risk
  1. lib/response.js        score 2242   53 authors   128 changes
  2. lib/router/index.js    score 1891   41 authors   109 changes
  3. lib/application.js     score 1204   38 authors    87 changes

IMPLICIT COUPLING
  benchmarks/Makefile ↔ benchmarks/run   co-commit rate: 100%
```

> Run time: Express ~3 seconds · Kubernetes (99k files) ~3 minutes

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

## Requirements

Node.js >= 18 and git >= 2.30. Works on Linux, macOS, and Windows (WSL).

## Contributing

```bash
git clone https://github.com/SushantVerma7969/git-archaeologist.git
cd git-archaeologist
npm install && npm run build
node dist/index.js analyze /any/repo
```

## Roadmap

- [ ] PR reviewer/approver data
- [ ] Full history mode — remove commit window cap
- [ ] Extend GitHub Action to report `risk`/Owner Activity findings, not just curse score

## License

[MIT](LICENSE)
