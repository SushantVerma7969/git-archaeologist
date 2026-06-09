# git-archaeologist

![HTML report — interactive risk heatmap](./preview.png)

[![npm](https://img.shields.io/npm/v/git-archaeologist?color=a78bfa&labelColor=1a1d27)](https://www.npmjs.com/package/git-archaeologist) [![license](https://img.shields.io/badge/license-MIT-a78bfa?labelColor=1a1d27)](LICENSE) [![node](https://img.shields.io/badge/node-%3E%3D18-a78bfa?labelColor=1a1d27)](https://nodejs.org)

> Before you touch a file, know its blast radius, its curse score, and who will be left holding it when something breaks.

## 📊 State of OSS Maintainability 2026
We analyzed 26 major OSS repositories — 438,904 files, 26/26 had at least one bus factor 1 module.
👉 **[Read the full report](https://sushantverma7969.github.io/git-archaeologist/)**

[Install](#install) · [Usage](#usage) · [What it finds](#what-it-finds) · [How scoring works](#how-scoring-works) · [Research](RESEARCH.md) · [Benchmarks](BENCHMARKS.md)

---

You inherit a codebase. You touch a file. Three things break that had no visible connection.

Most tools show you the code. This one shows you the history behind the code — which files are getting more dangerous, what breaks when you touch something, who truly owns what, and which modules will be orphaned the day one person leaves.

## Install

```bash
npm install -g git-archaeologist
```

Then run it on any repository:

```bash
git-arch analyze /path/to/repo
```

## Usage

```bash
git-arch analyze /path/to/repo
git-arch analyze /path/to/repo --since 90d     # only last 90 days of commits
git-arch analyze /path/to/repo --since 2y      # only last 2 years
git-arch analyze /path/to/repo --since 2024-01-01  # since a specific date
git-arch analyze /path/to/repo --html          # dark-themed interactive report
git-arch cursed --top 10                       # just the danger ranking
git-arch cursed --top 10 --since 1y /path/to/repo  # danger ranking, recent only
git-arch analyze /path/to/repo --json          # pipe into other tools
git-arch blame lib/response.js /path/to/repo   # deep dive on one file
git-arch trend /path/to/repo                   # which files are getting more dangerous
git-arch blast lib/response.js /path/to/repo   # what else breaks when you touch this file
git-arch ownership /path/to/repo               # who owns what — folder breakdown + bus factor
git-arch pr-risk /path/to/repo                 # score your changes before pushing
```

## Example output

```
$ git-arch analyze ./express

✔ Analysis complete — 312 files scanned

CURSE SCORE — top files by risk
  1. lib/response.js        score 2242   53 authors   128 changes
  2. lib/router/index.js    score 1891   41 authors   109 changes
  3. lib/application.js     score 1204   38 authors    87 changes

BUS FACTOR
  lib/        → 1  (dougwilson owns 71%)
  test/       → 1  (dougwilson owns 68%)

IMPLICIT COUPLING
  benchmarks/Makefile ↔ benchmarks/run   co-commit rate: 100%
```

> Run time: Express ~3 seconds · Kubernetes (99k files) ~3 minutes

## What it finds

Curse score — not just most changed. A file touched 100 times in 6 months by 15 people who never talked scores way higher than one touched 200 times over a decade by the same person. Recency, author chaos, churn rate, and acceleration combined into one number. Changelogs and lockfiles are automatically excluded — only real source files show up.

Bus factor per folder — not per repo. Knowing the whole repo has bus factor 2 is useless. Knowing lib/ is orphaned the day one person leaves is something you can act on.

Implicit coupling — files that always change together in the same commit even though nothing in the code connects them. These are your hidden dependencies.

Ownership — who owns the lines alive in HEAD right now, not who created the file or who committed last.

## Tested on Express.js

Express is one of the most downloaded npm packages in history. 230 contributors. 16 years old.

Running git-archaeologist on it takes 3 seconds and finds:

- `lib/response.js` — 128 changes, 53 different authors, curse score 2261. The core HTTP response logic of the framework has been touched by 53 people and nobody fully owns it.
- Bus factor across every module (lib/, test/, examples/, benchmarks/) is 1. One person. The entire project depends on Douglas Christopher Wilson continuing to show up.
- `benchmarks/Makefile` and `benchmarks/run` have been committed together 100% of the time. They have never changed separately. They are one file.

## How scoring works

```
curse_score = changes x log2(authors+1) x exp(-0.5 x age_years) x log2(churn_rate+2) x acceleration
```

The exponential decay on age means old chaos that stabilized does not show up. The acceleration multiplier means files getting worse recently score higher than ones with similar totals that have stabilized. Changelogs, lockfiles, and CI config files are automatically excluded so the list shows real source files.

## Why not git log?

`git log` tells you what happened. `git-archaeologist` tells you where the risk is.

- Finds bus-factor-1 modules automatically across every folder
- Detects ownership concentration before it becomes a problem
- Surfaces files becoming more dangerous over time
- Discovers hidden coupling through commit co-occurrence
- Generates interactive HTML reports for large repositories

Instead of reading thousands of commits manually, you get a ranked view of the parts of a codebase most likely to cause trouble.

## Requirements

Node.js >= 18 and git >= 2.30. Works on Linux, macOS, and Windows (WSL).


## GitHub Action

Add this to any repo to get automatic analysis on every push:

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
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

`fetch-depth: 0` is required — without full history the analysis is incomplete.

## Contributing

```bash
git clone https://github.com/SushantVerma7969/git-archaeologist.git
cd git-archaeologist
npm install && npm run build
node dist/index.js analyze /any/repo
```

## License

[MIT](LICENSE)

