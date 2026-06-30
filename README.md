# ⛏ Git Archaeologist

[![npm](https://img.shields.io/npm/v/git-archaeologist?color=a78bfa&labelColor=1a1d27)](https://www.npmjs.com/package/git-archaeologist) [![CI](https://img.shields.io/github/actions/workflow/status/SushantVerma7969/git-archaeologist/ci.yml?branch=main&labelColor=1a1d27&color=a78bfa)](https://github.com/SushantVerma7969/git-archaeologist/actions/workflows/ci.yml) [![license](https://img.shields.io/badge/license-MIT-a78bfa?labelColor=1a1d27)](LICENSE) [![node](https://img.shields.io/badge/node-%3E%3D18-a78bfa?labelColor=1a1d27)](https://nodejs.org)

A local, zero-dependency Git metadata analyzer that flags single-point-of-failure risks (bus factor), hidden change coupling (temporal dependencies), and active code decay (curse score). 

---

### First-Screen Summary
* **What it does:** Mines local Git commit logs to discover structural abandonment, high-friction files, and hidden architectural coupling.
* **Why it exists:** Cyclomatic complexity flags complex files that are stable and never change. Git Archaeologist targets *active developer friction* to highlight where complexity is actively causing maintenance overhead.
* **Security & Privacy:** **100% Local.** Zero network requests. No telemetry. Your source code files are never read or parsed. It queries only read-only Git metadata (`git log`).
* **Quick Run:** Run directly on any Git repository root:
  ```bash
  npx git-archaeologist analyze .
  ```

---

## Table of Contents
1. [What is this?](#what-is-this)
2. [Why should I care?](#why-should-i-care)
3. [Is it safe?](#is-it-safe)
4. [Show me](#show-me)
5. [How do I install it?](#how-do-i-install-it)
6. [What can it do?](#what-can-it-do)
7. [Can I trust the results?](#can-i-trust-the-results)
8. [How does it work?](#how-does-it-work)
9. [Why is it different?](#why-is-it-different)
10. [How do I integrate it?](#how-do-i-integrate-it)
11. [FAQ](#faq)
12. [Case Studies](#case-studies)
13. [License](#license)

---

## What is this?
**Git Archaeologist** is a developer tooling engine designed to analyze team commit patterns. By analyzing metadata—commit hashes, authors, timestamps, renames, and file change matrices—it detects where knowledge is concentrated in too few minds, which files are undergoing accelerating decay, and what hidden dependencies exist between modules.

---

## Why should I care?
* **Identify Abandoned Code:** Traditional `git blame` is static. It does not distinguish between a file actively maintained and a file written by a developer who left the organization 5 years ago.
* **Find Hidden Coupling:** Large files often trigger changes in distant directories (e.g., changing a router requires modifying a configuration registry). These relationships are rarely captured by static imports.
* **Optimize Review Times:** Avoid letting high-risk refactors pass under a quick approval, while community-owned UI changes get blocked by arbitrary code reviewers.

---

## Is it safe?
Yes. It is explicitly designed for secure enterprise environments:
* **No Telemetry:** The CLI contains no outgoing telemetry, analytical tracking, or network calls.
* **No AST Parsing:** The source code text is never read, parsed, or loaded. It runs purely on file names, change lists, and authorship logs.
* **Local Process Wrapper:** Runs as a read-only wrapper around your system's native `git` binary.

---

## Show me

### 1. Identify high-risk, decaying files
Run the `analyze` command to locate files with high churn, distributed authorship, and accelerating changes.
```bash
npx git-archaeologist analyze .
```
**Example Output:**
```text
  HIGH RISK DEVELOPER FRICTION
  lib/response.js
  ├── Total Changes: 392
  ├── Unique Authors: 80
  └── Curse Score: 23,507 (Modified recently, accelerating churn)
```

### 2. Discover hidden change dependencies (Blast Radius)
Find files that historically change together in lockstep, even if they have no static imports between them.
```bash
npx git-archaeologist blast src/core/router.ts .
```
**Example Output:**
```text
  IMPLICIT COUPLING (BLAST RADIUS)
  src/core/router.ts ↔ config/routes.json   coupling: 79.4% (co-changed in 34/42 commits)
```

---

## How do I install it?

Execute without installation:
```bash
npx git-archaeologist analyze .
```

Or install globally:
```bash
npm install -g git-archaeologist
```

Run as a custom subcommand:
```bash
git arch analyze
```

---

## What can it do?

### Core Commands

| Command | Purpose | When to Use |
|---|---|---|
| `git-arch analyze [path]` | Overview of repo, bus factor 1 scopes, top cursed files. | Initial project audits or monthly architectural reviews. |
| `git-arch risk [path]` | Detailed per-folder bus factor and ownership concentration maps. | Identifying knowledge silos before offboarding team members. |
| `git-arch blast <file> [path]` | Calculates implicit coupling and blast radius for a target file. | Before refactoring unfamiliar code to avoid breaking distant files. |
| `git-arch blame <file> [path]` | Full author history, acceleration trends, and change timeline. | Reviewing a file's active contributors and recency trends. |
| `git-arch cursed` | Ranks all repository files by structural decay (Curse Score). | Scoping technical debt removal sprints. |
| `git-arch trend [path]` | Compares historic baseline vs current activity to show decay direction. | Reporting codebase health trends over time. |

---

## Can I trust the results?

### Semantic Filtering Engine
A common complaint about git-log mining tools is noise: lockfiles (`package-lock.json`), documentation changes, and mechanical refactors (like automated lint fixes or formatting sweeps) pollute history. 

Git Archaeologist filters out this noise using a two-tier filter:
1. **Structural Exclusions:** Structural configs, lockfiles, dependency manifests, and documentation are excluded from active calculations.
2. **Session Session Grouping:** Merges closely timed commit chains (within a 2-hour window) by the same developer to treat multi-commit tasks as single logical refactors, preventing micro-commits from skewing the results.

---

## How does it work?

### The Curse Score Heuristic
The Curse Score measures file decay using a damped recency decay algorithm:
$$\text{Curse Score} = \text{Changes} \times \log_2(\text{Authors} + 1) \times e^{-0.5 \times \text{Age in Years}} \times \log_2(\text{Churn} + 2) \times \text{Acceleration}$$

* **Changes:** The total commits touching the file.
* **Authors:** $\log_2(\text{Unique Authors} + 1)$ scales down coordination overhead dampening.
* **Age Decay:** $e^{-0.5 \times \text{Age}}$ implements an exponential decay half-life (~1.4 years). Stable legacy files decay toward a risk score of 0.
* **Acceleration:** The ratio of changes in the last 6 months compared to the prior 6 months (clamped to $[0.5, 2.0]$).

### Identity Merging Engine
If a contributor commits under different email addresses (e.g., `joe@facebook.com`, `joe@meta.com`, or GitHub's default `noreply` handle), they appear as separate individuals, distorting the true bus factor. 
Git Archaeologist resolves this by canonicalizing identities using a deterministic union-find algorithm:
- Links GitHub handles to real emails.
- Merges matching display names where local-parts of emails match.
- Supports manual override mappings via a `.git-arch-identities` file in the repository root.

---

## Why is it different?

| Feature | Git Archaeologist | Static Analysis (AST) | CodeScene |
|---|---|---|---|
| **Primary Metric** | Developer commit behavior | Lines of code, nesting, complex syntax | Commit history & Git operations |
| **Execution** | 100% Local CLI | Local or CI plugins | Cloud SaaS / Enterprise Server |
| **Telemetry** | None | Varies | Full integration |
| **Setup Cost** | 0 seconds (`npx`) | High config per language | High configuration / pricing |
| **Complexity Focus** | Active friction points | Structural code syntax | Project manager dashboards |

---

## How do I integrate it?

### GitHub Action (Pull Request Reviewer)
Add a workflow file at `.github/workflows/git-archaeologist.yml` to automatically analyze PR risk and comment on pull requests:

```yaml
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
        uses: SushantVerma7969/git-archaeologist@v1.32.10
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

---

## FAQ

#### Can Git history be trusted?
Yes, provided you do not rewrite history constantly. Git log history represents the literal trace of team coordination. If developers squash-merge, the squashed commits are still captured correctly. 

#### Does this support monorepos?
Yes. Since bus factor is calculated per-folder (not globally), developers working in `services/billing` will not skew the metrics of developers working in `services/auth`.

#### What if I have a shallow clone?
Git Archaeologist will fail validation on shallow clones. You must run `git fetch --unshallow` or set `fetch-depth: 0` in checkout configurations to provide the engine with full temporal baseline history.

---

## Case Studies
Read real-world production analyses run against mature repositories:
* [Express (lib/response.js decay case study)](docs/case-studies/express.md)
* [ESLint (structural coupling patterns)](docs/case-studies/eslint.md)
* [OpenSauced (rapid ownership transitions)](docs/case-studies/opensauced.md)

---

## License
MIT License. Created by Sushant Verma.
