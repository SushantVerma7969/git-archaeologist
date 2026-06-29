# Case Study: ESLint

## Repository Overview
ESLint is the ubiquitous static analysis tool for JavaScript. It is a massive, highly mature enterprise architecture spanning over a decade of continuous development.

## Why this repository was selected
To evaluate whether Git Archaeologist can handle enterprise-scale repositories without crashing, and to discover whether mathematical coupling exists in massive legacy codebases.

## Repository Statistics
- **Commits:** ~30,000
- **Age:** 13 years
- **Scale:** 2,897 files scanned

## Exact Commands Executed
```bash
git-arch analyze .
git-arch blast lib/rules/index.js .
```

## Execution Time
`< 90 seconds` (Full history parsing of 13 years of commits)

## Key Findings

### 1. Spooky Action at a Distance (Implicit Coupling)
**Command:** `git-arch blast lib/rules/index.js .`
**CLI Output:**
```
IMPLICIT COUPLING
  lib/rules/index.js ↔ tools/rule-types.json   co-changes: 79.4%
```
**Observation:** A core JS execution file is structurally tethered to a static JSON tool configuration file in a completely different root directory, changing together 79.4% of the time.

### 2. Accelerating Decay
**Command:** `git-arch analyze .`
**CLI Output:**
```
CURSE SCORE — top files by instability
  1. lib/rules/no-unused-vars.js      score 14502   61 authors
     ↳ Change rate accelerating (2.0x)
```
**Observation:** `lib/rules/no-unused-vars.js` is actively decaying, experiencing a 2.0x acceleration in its historical churn rate compared to its baseline.

### 3. The Obvious Noise
**Command:** `git-arch analyze .`
**CLI Output:**
```
CURSE SCORE — top files by instability
  1. lib/linter/linter.js      score 23507   102 authors   457 changes
```
**Observation:** The core engine changes the most. This is technically true, but completely unsurprising to any engineer familiar with the project.

## What Surprised Us
The ability of `blast` to find the exact blast radius of spaghetti code before a refactor. The 80% coupling between `rules/index.js` and `rule-types.json` is not evident through IDE import tracing, yet it fundamentally dictates the required scope of work.

## Limitations
Core architectural files (`linter.js`) return a blast radius of 0. Because they change constantly across so many different features, their commit co-occurrences dilute into mathematical noise.

## Engineering Takeaways
- Stop guessing the blast radius of your refactors. Measure it using commit history.
- Legacy files that are accelerating in churn require immediate sprint intervention before they cause incidents.

## Why another engineer should care
It prevents the classic mistake of pushing a refactor, waiting 15 minutes for CI, watching the build fail due to a missed dependency, and repeating the cycle. `blast` defines the exact scope of work locally, in seconds.

## Suggested Screenshots
- A terminal screenshot of `git-arch blast` showing the 79.4% coupling matrix.

## Suggested Terminal Snippet
```bash
npx git-archaeologist blast lib/rules/index.js .
```

## Suggested Social Media Excerpt
You can't `grep` for hidden dependencies. In ESLint, `rules/index.js` and `rule-types.json` change together 80% of the time, even though they aren't imported. We built `git-arch blast` to find the exact blast radius of spaghetti code before you refactor it.
