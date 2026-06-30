# git-archaeologist

A local, zero-dependency Git metadata analyzer that detects code decay, knowledge silos (bus factor), and hidden module coupling.

---

```text
$ git-arch analyze
✔ Validation complete — 1,402 files scanned

✔ Found 2 Bus Factor 1 directories
  ├── src/core/router (Owner TJ Holowaychuk: 94.2% share)
  └── src/store/db     (Owner Dan Abramov:   88.0% share)

✔ Hidden dependency discovered (Blast Radius)
  └── src/core/router.ts ↔ config/routes.json (79.4% historical coupling)

✔ Highest decay (Curse Score)
  └── lib/response.js (Score: 23,507 — high churn, 80 authors, active)
```

---

## Install

Run instantly without installation:
```bash
npx git-archaeologist analyze .
```

Or install globally:
```bash
npm install -g git-archaeologist
```

---

## 30-Second Quick Start

Analyze active project risk:
```bash
git-arch analyze .
```

Discover what historically changes alongside a specific file:
```bash
git-arch blast src/core/router.ts .
```

Find the top decaying files:
```bash
git-arch cursed .
```

---

## What You'll Discover

### 1. Folder-Level Silos (`git-arch risk`)
Locate areas where knowledge is concentrated in a single developer (Bus Factor of 1) and see when that contributor was last active in the project:
```text
  support
  ├── Bus Factor: 1
  ├── Touch Concentration: 97.2%
  └── Primary Driver: TJ Holowaychuk (Last active 4 years ago)
```

### 2. File Churn & Code Decay (`git-arch cursed`)
Ranks codebase files by active developer friction (Curse Score), prioritizing recently changed files with high contributor churn over stable legacy complexity:
```text
  lib/response.js
  ├── Churn Rate: 392 commits
  ├── Authors: 80 unique developers
  └── Curse Score: 23,507 (Accelerating changes)
```

---

## Why This Is Different
* **Offline First:** Zero network calls, zero telemetry. Your source code never leaves your machine.
* **No AST Overhead:** Language-agnostic. Mines Git metadata instead of parsing syntax, completing analysis in under 2 seconds.
* **Focuses on Friction:** Cyclomatic complexity flags complex files that are stable. Git Archaeologist targets files that developers are *actively* struggling with.
* **Identity Merging:** Built-in identity canonicalization merges multiple contributor email aliases and GitHub `noreply` handles automatically.

---

## Real Case Studies
Read technical risk reports run against mature repositories:
* [Express (HTTP response decay)](docs/case-studies/express.md)
* [ESLint (rules config coupling)](docs/case-studies/eslint.md)
* [OpenSauced (rapid ownership transitions)](docs/case-studies/opensauced.md)

---

## GitHub Action

Analyze pull request risk automatically and post summaries directly to the PR:

```yaml
# .github/workflows/git-archaeologist.yml
name: Git Archaeologist PR Reviewer

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  review:
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0 # Full history is required for age-decay analysis

      - name: Analyze PR Risk
        uses: SushantVerma7969/git-archaeologist@v1.32.12
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

---

## Documentation
* [How it Works & Mathematics](docs/how-it-works.md) (Curse Score formula, identity union-find)
* [Security & Threat Model](docs/security.md) (Read-only queries, data guarantees)
* [Performance & Monorepos](docs/performance.md) (Complexity bounds, monorepo performance)

---

## Contributing
Please see [CONTRIBUTING.md](CONTRIBUTING.md) for setup and development guidelines.

---

## License
MIT License. Created by Sushant Verma.
