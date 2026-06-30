# git-archaeologist

A local, zero-dependency Git metadata analyzer that detects code decay, knowledge silos (bus factor), and hidden module coupling.

---

### Key Guarantees
* **100% Offline:** Runs entirely on your machine. Zero network requests, zero telemetry.
* **Metadata-Only:** Never reads or parses your source code content. Operates strictly on Git logs.
* **Language Agnostic:** Works on any Git repository, from microservices to large monorepos.

```bash
# Run instantly without installation
npx git-archaeologist analyze .
```

---

## Output Example

Running `git-arch analyze` scans commit history and outputs an active risk profile:

```text
$ git-arch analyze
✔ Validation complete — 1,402 files scanned

   HIGH-RISK ARCHITECTURAL SILOS (BUS FACTOR 1)
   ┌──────────────────────┬─────────────┬─────────────┬────────────────────────────────────┐
   │ Scope (Directory)    │ Bus Factor  │ Owner Share │ Primary Driver (Last Active)       │
   ├──────────────────────┼─────────────┼─────────────┼────────────────────────────────────┤
   │ src/core/router      │ 1           │ 94.2%       │ TJ Holowaychuk (4 years ago)       │
   │ src/store/db         │ 1           │ 88.0%       │ Dan Abramov (2 years ago)          │
   └──────────────────────┴─────────────┴─────────────┴────────────────────────────────────┘

   TOP DECAYING FILES (CURSE SCORE)
   ┌──────────────────────────────────┬─────────────┬─────────┬────────────────────────────┐
   │ Filepath                         │ Curse Score │ Changes │ Primary Driver             │
   ├──────────────────────────────────┼─────────────┼─────────┼────────────────────────────┤
   │ src/core/router.ts               │ 23,507      │ 392     │ TJ Holowaychuk             │
   │ src/store/db/client.ts           │ 18,201      │ 241     │ Dan Abramov                │
   └──────────────────────────────────┴─────────────┴─────────┴────────────────────────────┘
```

---

## Installation

Run directly using `npx`:
```bash
npx git-archaeologist analyze .
```

Or install globally:
```bash
npm install -g git-archaeologist
```

---

## Core Capabilities

### 1. Active Code Decay (Curse Score)
Traditional complexity metrics (e.g., cyclomatic complexity or lines of code) tell you how complex a file is, but not if that complexity actually causes friction. A complex configuration file that has been untouched for five years is not a risk; it is a stable black box. 

Git Archaeologist calculates the **Curse Score** to isolate files that are actively decaying under high churn, high author dispersion, and accelerating changes.

### 2. Temporal Coupling (Blast Radius)
Files that always change together in the same commits have an implicit dependency, even if they share no static imports or code links (e.g., changing a router requires modifying a configuration file).
```bash
git-arch blast src/core/router.ts .
```
```text
  IMPLICIT COUPLING (BLAST RADIUS)
  src/core/router.ts ↔ config/routes.json   coupling: 79.4% (co-changed in 34/42 commits)
```

### 3. Folder-Level Bus Factor
Instead of calculating a global repository bus factor, Git Archaeologist maps knowledge distribution per subdirectory, highlighting sub-modules that are single-point-of-failures (Bus Factor of 1) and whether their dominant owner is still active.

---

## Command Reference

| Command | Action |
|---|---|
| `git-arch analyze [path]` | Overview of repo, bus factor 1 scopes, top cursed files. |
| `git-arch risk [path]` | Detailed per-folder bus factor and ownership concentration maps. |
| `git-arch blast <file> [path]` | Calculates implicit coupling and blast radius for a target file. |
| `git-arch blame <file> [path]` | Full author history, acceleration trends, and change timeline. |
| `git-arch cursed` | Ranks all repository files by structural decay (Curse Score). |
| `git-arch trend [path]` | Compares historic baseline vs current activity to show decay direction. |

---

## GitHub Action Integration

Analyze pull requests automatically and post structural risk commentary directly on GitHub PRs.

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
        uses: SushantVerma7969/git-archaeologist@v1.32.11
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

**PR Comment Example:**
> ### ⚠️ High-Risk Files Modified
> - `src/core/router.ts` (Curse Score: **23,507**)
>
> ### 🔗 Coupling Warnings (Blast Radius)
> **`src/core/router.ts`** historically changes alongside:
> - `config/routes.json` (79.4% co-occurrence)

---

## How It Works

### The Curse Score Formula
$$\text{Curse Score} = \text{Changes} \times \log_2(\text{Authors} + 1) \times e^{-0.5 \times \text{Age in Years}} \times \log_2(\text{Churn} + 2) \times \text{Acceleration}$$

* **Changes:** The total commits touching the file.
* **Authors:** $\log_2(\text{Unique Authors} + 1)$ dampens author count to represent coordination overhead.
* **Age Decay:** $e^{-0.5 \times \text{Age}}$ implements an exponential decay half-life (~1.4 years). Stable legacy files decay toward a risk score of 0.
* **Acceleration:** The ratio of changes in the last 6 months compared to the prior 6 months (clamped to $[0.5, 2.0]$).

### Identity Merging
If a contributor commits under different email addresses (e.g., `joe@facebook.com` and `joe@meta.com`), they appear as separate individuals, distorting the true bus factor. Git Archaeologist runs a deterministic union-find algorithm to canonicalize identities and supports manual mappings via a `.git-arch-identities` file in the repository root.

---

## FAQ

#### Can Git history be trusted?
Yes, because Git history tracks the literal trace of team coordination. Even if developers squash-merge, the squashed commits are still captured correctly.

#### Does this support monorepos?
Yes. Since bus factor and ownership are calculated folder-by-folder (not globally), active developers in one service do not skew the risk metrics of another.

#### What if I have a shallow clone?
The tool requires full commit history to calculate temporal baseline metrics and will throw an error on shallow clones. Always ensure `fetch-depth: 0` is set in checkout configurations in CI.

---

## Case Studies
Read real-world production analyses run against mature repositories:
* [Express (lib/response.js decay case study)](docs/case-studies/express.md)
* [ESLint (structural coupling patterns)](docs/case-studies/eslint.md)
* [OpenSauced (rapid ownership transitions)](docs/case-studies/opensauced.md)

---

## License
MIT License. Created by Sushant Verma.
