# git-archaeologist

[![npm](https://img.shields.io/npm/v/git-archaeologist?color=a78bfa&labelColor=1a1d27)](https://www.npmjs.com/package/git-archaeologist) [![CI](https://img.shields.io/github/actions/workflow/status/SushantVerma7969/git-archaeologist/ci.yml?branch=main&labelColor=1a1d27&color=a78bfa)](https://github.com/SushantVerma7969/git-archaeologist/actions/workflows/ci.yml) [![license](https://img.shields.io/badge/license-MIT-a78bfa?labelColor=1a1d27)](LICENSE) [![node](https://img.shields.io/badge/node-%3E%3D18-a78bfa?labelColor=1a1d27)](https://nodejs.org)

> [!IMPORTANT]
> **Security Guarantee:** Git Archaeologist is explicitly designed to be run safely on proprietary enterprise codebases. It is a local, read-only wrapper around `git log`. **Your source code never leaves your machine.** There is no AST parsing, no telemetry, and the CLI makes exactly zero network requests. 

## What does this tool do?
Git Archaeologist measures *human engineering friction* instead of static code complexity. It analyzes your team's historical commit behavior to identify structural abandonment, hidden dependencies, and accelerating code decay. 

## Why should you care?
Historical `git blame` is dangerous without temporal context. If a tool tells you someone owns 97% of a core module, but fails to tell you they left the company 4 years ago, the metric is functionally useless. This tool separates active maintainers from abandoned legacy architecture.

## Quick Start
Run it from the root of any git repository. No installation or configuration required.

```bash
npx git-archaeologist risk .
```

## The First Five Minutes

### 1. Stop guessing the blast radius
When you decouple legacy code, you can't `grep` for hidden dependencies. `blast` reveals which files always change together even if they aren't imported.

**Command:**
```bash
npx git-archaeologist blast lib/rules/index.js .
```
**Output:**
```
IMPLICIT COUPLING
  lib/rules/index.js ↔ tools/rule-types.json   co-changes: 79.4%
```
*(Example from our ESLint case study: A core execution file is structurally tethered to a static JSON tool configuration file, changing together 80% of the time).*

### 2. Find Abandoned Architecture
Measure technical debt before it causes an incident.

**Command:**
```bash
npx git-archaeologist risk .
```
**Output:**
```
  HIGH RISK
  support
  Historical commit-touch concentration: 97.2%
  Bus Factor: 1

  Top historical contributor: TJ Holowaychuk
  Latest analyzed activity: 12 years ago
```
*(Example from our Express case study: The core architecture is 97% owned by a single contributor who hasn't touched the repository in 12 years).*

## The GitHub Action (PR Risk Engine)

The CLI is a powerful investigative weapon, but the only way to guarantee 100% long-term retention is to embed the tool in your CI/CD pipeline. 

The Git Archaeologist GitHub Action intercepts pull requests, calculates the historical risk of the modified files, and posts a clean Markdown summary. It ensures dangerous architectural changes are flagged for Staff-level review while community UI changes are rubber-stamped.

**Example PR Comment:**

> ## ⛏ Git Archaeologist Review
>
> > *Automated structural risk assessment based on commit history.*
>
> ### 📊 Repository Risk Summary
> **Files analyzed in this PR:** 3
>
> ### ⚠️ High-Risk Files
> - `src/core/router.ts` (Curse Score: **14502**)
>
> ### 🔗 Coupling Warnings (Blast Radius)
> **`src/core/router.ts`** historically changes alongside:
> - `config/routes.json`
>
> ### 🚌 Ownership Suggestions
> If this PR modifies core architecture, ensure it is reviewed by the historical owners, not just random assignees.
>
> ---
> *[Git Archaeologist](https://github.com/SushantVerma7969/git-archaeologist) | Stop guessing the blast radius.*

See [`.github/workflows/archaeologist.yml`](.github/workflows/git-archaeologist.yml.example) for the production-ready implementation.

## Real Case Studies
We empirically executed Git Archaeologist against massive enterprise architectures. Read the technical postmortems:
- [ESLint (13 Years, 30k Commits)](docs/case-studies/eslint.md) 
- [Express (14 Years, 6k Commits)](docs/case-studies/express.md)
- [OpenSauced (4.5k Commits)](docs/case-studies/opensauced.md)

## Command Reference

```bash
npx git-archaeologist risk .              # Bus factor and temporal owner activity
npx git-archaeologist blast <file> .      # Hidden coupling and blast radius
npx git-archaeologist analyze .           # Macro overview, curse scores, coupling
npx git-archaeologist ownership .         # Ownership concentration maps
npx git-archaeologist cursed --top 10     # Show the top risky files
npx git-archaeologist pr-risk .           # Score local changes before pushing
```

## FAQ

**Does the curse score predict bugs?**
It correlates, but it does not predict. A high curse score flags files that are *socially complex enough that bugs tend to hide there*. 

**Why not just use CODEOWNERS?**
CODEOWNERS tells you who *should* review code, usually based on an outdated manual configuration. Git Archaeologist shows you who *actually* wrote the code, based on commit history.

**What if I use a shallow clone?**
Git Archaeologist requires the full commit history to function. If you run it on a shallow clone, the metrics will be wildly inaccurate. Always use `fetch-depth: 0` in CI environments.

## Detailed Documentation
- [How it Works & Mathematics](docs/how-it-works.md)
- [Security & Privacy Model](docs/security.md)
- [Performance & Scaling limits](docs/performance.md)
