# git-archaeologist

[![npm](https://img.shields.io/npm/v/git-archaeologist?color=a78bfa&labelColor=1a1d27)](https://www.npmjs.com/package/git-archaeologist) [![CI](https://img.shields.io/github/actions/workflow/status/SushantVerma7969/git-archaeologist/ci.yml?branch=main&labelColor=1a1d27&color=a78bfa)](https://github.com/SushantVerma7969/git-archaeologist/actions/workflows/ci.yml) [![license](https://img.shields.io/badge/license-MIT-a78bfa?labelColor=1a1d27)](LICENSE) [![node](https://img.shields.io/badge/node-%3E%3D18-a78bfa?labelColor=1a1d27)](https://nodejs.org)

**Find maintenance risk in your git history before it turns into a handoff problem.**

git-archaeologist reads commit history and shows where maintenance knowledge is concentrated: which folders have a low bus factor, which contributor owns most of the history, and whether that contributor is still around. A directory that's 70% written by someone who committed last week is a very different situation from one that's 70% written by someone who hasn't touched the repo in two years. Both look identical if you only count commits. This tool tells them apart.

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
  Maintenance risk map, not an ownership leaderboard
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

> Numbers above are from a June 2026 run against the full history of `expressjs/express`. Reproduce with `npx git-archaeologist risk .` on any clone. Exact figures shift as history grows.

## Why owner activity matters

This is the idea the whole tool is built around, so it's worth one concrete example.

We ran `git-arch risk` on two well-known projects and got similar concentration numbers with completely different stories underneath.

**Express, the `support/` folder**
- 97.2% of changes attributed to one contributor (TJ Holowaychuk, the original author)
- 389 contributors total across the repo
- That contributor's most recent commit anywhere in the repo was **12 years ago**
- Express has since moved under the OpenJS Foundation and is maintained by other people, but the historical concentration in this area still sits with someone long gone

**React, a core reconciler scope**
- 63.6% of changes attributed to one contributor (Andrew Clark)
- Bus factor 1, similar single-owner concentration
- That contributor committed **2 months ago** and is still active

Both are bus-factor-1, single-owner scopes. One owner has been gone for over a decade; the other is committing this quarter. The concentration number alone can't tell you which one you're looking at. Owner activity is what separates abandoned concentration from active concentration, and surfacing that difference is the point of this tool.

> Figures from a June 2026 run against the full history of each repo. Reproduce with `git-arch risk <repo> --all`. They drift over time, and that drift is the point.

## Concepts

**Ownership concentration** is the percent of a folder's commit touches that come from its single biggest contributor. High concentration isn't automatically bad; whether it matters depends on recency and redundancy.

**Bus factor** is computed per folder, not just per repo. A repo-wide bus factor of 5 can still hide a critical module owned entirely by one person.

**Owner activity** is when the dominant contributor last committed anywhere in the repo. This is what separates active concentration from abandoned concentration.

**HIGH / MEDIUM / LOW** is classified from ownership concentration and bus factor. Owner activity is shown alongside as context, so you can tell an active owner from a departed one. Run `--all` to see every scope, including LOW.

**Explainable output**: `git-arch risk` explains each scope with structured reasons and a short interpretation. The explanations reuse the same bus-factor and concentration values the risk command already computed. They don't run extra analysis or move the thresholds.

## Temporal classification

`git-arch risk --temporal` compares lifetime risk against the last 12 months. This helps you separate old concentration that has since spread out from new concentration that only became visible recently.

- **Persistent concentration**: concentrated over lifetime history and still concentrated recently
- **Historical concentration**: concentrated over lifetime history, but distributed recently
- **Emerging concentration**: distributed over lifetime history, but concentrated recently
- **Persistently distributed**: distributed in both windows
- **No recent activity**: lifetime history exists, but there are no recent non-bot touches
- **Insufficient recent evidence**: fewer than 10 recent non-bot touches

For this comparison, HIGH and MEDIUM count as concentrated and LOW counts as distributed.

## Hotspots

`git-arch risk --hotspots` ranks scopes by how many distinct maintenance-risk signals fired for them: bus factor of 1, high contributor churn, an inactive dominant contributor, recently rising concentration, and ownership transitions. There's no new weighted score behind it. Each fired signal carries its own evidence line, and scopes are ranked by how many signals fired, with concentration breaking ties. A scope where four distinct signals agree is a far stronger thing to investigate than one where a single number happens to look high.

By default it shows scopes with two or more signals. `--all` lowers that to one, and `--json` emits machine-readable output. As everywhere else, these are signals to investigate, not verdicts about ownership or maintainership.

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

For repeated use, install it globally:

```bash
npm install -g git-archaeologist
```

## Deeper analysis: curse score and coupling

`git-arch analyze` goes past the risk map. It ranks individual files by **curse score**, a combination of recency, author churn, and acceleration, and it detects **implicit coupling**: files that keep changing together even though nothing connects them at the code level.

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

> Curse scores are a within-repo ranking, not an absolute scale. A score of 23,507 is only meaningful next to the other files in the same repository. Numbers from a June 2026 run; reproduce with `git-arch analyze .`.

> Run time: small repos like Express take under a second; very large repos take a few minutes. Most of the cost is `git log`; the analysis itself is linear in commits.

### How the score is computed

```
curse_score = changes x log2(authors+1) x exp(-0.5 x age_years) x log2(churn_rate+2) x acceleration
```

The exponential decay on age means old chaos that has since stabilized stays quiet. The acceleration multiplier pushes files that are getting worse lately above files with similar totals that have settled down. Changelogs, lockfiles, and CI config are excluded automatically.

## Why not just `git log` or an ownership tool?

`git log` tells you what happened. Ownership tools tell you who touched code most. git-archaeologist adds the layer those leave out: bus factor, owner activity, temporal classification, and file-level history signals.

- Finds bus-factor-1 modules automatically across every folder
- Pairs ownership concentration with owner activity, so you can tell healthy concentration from abandonment
- Surfaces files that are getting more dangerous over time
- Discovers hidden coupling through commit co-occurrence
- Generates interactive HTML reports for large repositories

## MCP server (for AI agents)

git-archaeologist ships an [MCP](https://modelcontextprotocol.io) server, so an AI coding agent can query a repository's history directly instead of parsing CLI output. Start it over stdio:

```bash
git-arch mcp
```

It exposes five tools, each returning structured JSON:

- **`analyze_repo`**: overview with commit and contributor totals, bus-factor-1 scopes, top cursed files, and merged identities
- **`who_owns`**: who has historically owned a specific file, and how recently they were active
- **`get_bus_factor`**: per-folder single-point-of-failure map
- **`find_coupled_files`**: files that have historically changed together
- **`get_risk_hotspots`**: scopes where several distinct risk signals agree

All tools take an optional `repoPath`, defaulting to the working directory. Example client configuration:

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

As with the CLI, these are signals from commit history to investigate, not conclusions about ownership or who should be assigned work.

## GitHub Action (advanced)

Runs curse-score analysis on every push or PR and comments the result. It reports curse-score findings for risky files; the `git-arch risk` owner-activity and temporal views are CLI-only for now.

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

`fetch-depth: 0` is required. Without full history the analysis is incomplete.

## Known limitations

Be honest with yourself about what this measures before you act on it.

- Commit authorship is not the same as knowledge ownership. Someone who reviewed every PR may not show up at all.
- Multiple Git identities for one person can skew ownership numbers. The tool merges obvious cases but stays conservative.
- PR reviews and approvals aren't analyzed, only commits.
- Treat the output as a place to start asking questions, not as a final judgment about anyone.

## Does the curse score predict bugs?

Short answer: it correlates, but don't oversell it. In a small manual check, the top curse-scored files in Express, React, and Vue were consistently files with heavy public bug-and-fix history. That's a hand-checked correlation on a handful of files, not a controlled study. The honest framing is that a high curse score flags files that are *socially complex enough that bugs tend to hide there*, rather than predicting bugs directly. The [validation write-up](RESEARCH.md) walks through the method and where it breaks down.

- [Curse Score Validation Notes](RESEARCH.md): method, results, and why this is correlation rather than prediction
- [Repository Risk Benchmark 2026](BENCHMARKS.md): multi-repo analysis of bus-factor-1 modules

## Additional notes

- [DESIGN.md](DESIGN.md) — rationale behind scoring and analysis decisions
- [FEEDBACK.md](FEEDBACK.md) — discoveries and lessons learned during development
- [RESEARCH.md](RESEARCH.md) — validation study and methodology

## Requirements

Node.js >= 18 and git >= 2.30. Works on Linux, macOS, and Windows (WSL).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, a tour of the code structure, how to submit PRs, and the testing standards.

```bash
git clone https://github.com/SushantVerma7969/git-archaeologist.git
cd git-archaeologist
npm install && npm run build
npm test
```

## License

[MIT](LICENSE)
