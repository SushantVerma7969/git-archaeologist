# ⛏ Git Archaeologist

A local, zero-dependency Git metadata analyzer that detects code decay, knowledge silos (bus factor), and hidden module coupling.

---

```text
Git Archaeologist Investigation Report
──────────────────────────────────────

✓ Knowledge Silos
  support/
  Bus Factor: 1
  Risk Share: 92%

✓ Hidden Coupling
  router.ts ↔ routes.json
  79.4% historical co-changes

✓ Highest Active Decay
  lib/response.js
  Curse Score: 23,507
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

## Three Commands to Start

### 1. Repository-wide audit:
```bash
git-arch analyze .
```

### 2. Discover hidden coupling:
```bash
git-arch blast src/core/router.ts .
```

### 3. Rank active code decay:
```bash
git-arch cursed .
```

---

## Why It Matters
* **Friction vs Complexity:** Static analysis flags complex code that is stable. Git Archaeologist targets complex files that developers are *actively* struggling with.
* **100% Offline Privacy:** Runs completely locally on read-only logs. Your source code never leaves your machine.
* **Identity Resolution:** Merges multiple developer email aliases and GitHub `noreply` handles automatically.
* **Noise Exclusions:** Ignores lockfiles, build configurations, and mechanical code formatting refactors.

---

## Case Studies

**[Express](docs/case-studies/express.md)** • **[ESLint](docs/case-studies/eslint.md)** • **[OpenSauced](docs/case-studies/opensauced.md)**

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
        uses: SushantVerma7969/git-archaeologist@v1.32.13
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

---

## Docs
* [How it Works & Mathematics](docs/how-it-works.md) (Curse Score formula, identity union-find)
* [Security & Threat Model](docs/security.md) (Read-only queries, data guarantees)
* [Performance & Monorepos](docs/performance.md) (Complexity bounds, monorepo performance)

---

## License

[MIT](LICENSE)
