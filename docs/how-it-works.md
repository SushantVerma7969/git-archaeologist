# How Git Archaeologist Works

Git Archaeologist calculates the structural and maintenance risk of a codebase by analyzing the temporal behavior of its engineering team, rather than parsing its source code syntax.

This document explicitly breaks down the heuristics, the math behind them, and where the tool makes assumptions.

## Why Git History?
Static analysis (AST parsing) tells you how complex a file is. It does not tell you if that complexity is actually causing problems. A terrifyingly complex file that hasn't been touched in five years and never produces bugs is not a risk; it is a stable black box. Conversely, a simple configuration file that causes production incidents every week is a massive risk. 

Git history is the only ground-truth record of *engineering pain*. By analyzing the frequency, acceleration, and concentration of commits, we measure human friction instead of code syntax.

---

## 1. The Curse Score (Decay Heuristic)
The Curse Score identifies files that demand ongoing, accelerating maintenance attention. It is a relative, within-repo ranking.

### The Mathematics
```text
Curse Score = Changes 
            × log2(Authors + 1) 
            × exp(-0.5 × Age in Years) 
            × log2(Churn Rate + 2) 
            × Acceleration Ratio
```

- **Changes (Linear):** The raw number of historical commits touching the file.
- **Authors (Dampened):** `log2(Authors + 1)`. More authors means diffuse knowledge and higher coordination cost. The logarithm ensures the penalty saturates (going from 1 to 3 authors is a massive shift; going from 40 to 42 is negligible).
- **Age Decay (Exponential):** `exp(-0.5 × Age)`. This is the critical mechanism. Old chaos that has stabilized is not today's risk. A half-life of ~1.4 years is applied. A file untouched for 1.4 years carries half the recency weight.
- **Churn Rate (Dampened):** `log2((Changes / Active Years) + 2)`. Distinguishes a file changed 100 times in one year from a file changed 100 times over a decade.
- **Acceleration Ratio (Clamped):** `[Recent 6 Months Changes / Prior 6 Months Changes]`, clamped to `[0.5, 2.0]`. Flags files that are actively getting *worse*.

### False Positives & Noise Exclusion
Lockfiles, changelogs, READMEs, and CI configurations change constantly but are not maintenance risks. These structural noise files are automatically forced to a score of 0.

---

## 2. Ownership Calculation
Ownership is calculated purely by commit touches to a given directory or file over its lifetime. 

```text
Concentration = (Touches by Dominant Author) / (Total Touches in Scope)
```

**Temporal Activity:** Concentration alone is meaningless. If a developer owns 97% of a module, that could be fantastic (an active, dedicated maintainer) or catastrophic (abandoned legacy code). The tool evaluates the **Latest Analyzed Activity** of the dominant author across the entire repository to classify the ownership as Active or Abandoned.

---

## 3. Bus Factor
Bus factor is calculated **per top-level folder**, not globally. 

**Calculation:** Authors are ranked by total touches to the scope. The tool iterates down the ranked list until it accumulates >50% of the total changes. The number of authors required to cross the 50% threshold is the Bus Factor.

**Assumptions:** A folder where one person holds 49% of the changes will report a Bus Factor of 2, even though it is practically single-owned. The 50% threshold is an industry-standard convention.

---

## 4. Implicit Coupling (Blast Radius)
The `blast` command discovers "Spooky Action at a Distance." 

**Calculation:** For a given file `A`, the tool queries the Git log to find every commit that modified `A`. It then tallies every other file `B` that was modified in those exact same commits.
```text
Coupling Score = (Commits containing both A and B) / (Commits containing A)
```

**False Positives:** Files that change constantly across all features (e.g., `package.json`, or a monolithic core `index.js`) will dilute their co-occurrence matrices into mathematical noise. Coupling is most accurate when measuring specific business logic files against hidden configurations.

---

## 5. PR Risk Scoring (Automated Triage)
The GitHub Action calculates a deterministic PR Risk Score (`0-100`) based on the intersection of the modified files and the repository's macro risk.

- **Curse Penalty:** If a PR modifies a file in the top `N` Cursed Files, it receives up to 50 penalty points (scaled by the file's normalized Curse Score).
- **Bus Factor Penalty:** If a PR modifies a folder that has a Bus Factor of 1, it receives a flat 20 penalty points.

**Assumptions:** The PR risk score assumes that touching unstable, single-owner code is inherently more dangerous than touching community-owned UI components, regardless of the line count of the PR.

---

## Known Limitations
1. **Authorship vs. Ownership:** Git Archaeologist measures who *committed* the code, not who reviewed it or planned it. An architect who paired on every feature but never ran `git commit` will be invisible.
2. **Identity Splitting:** Developers often commit under multiple email addresses. The tool conservatively merges exact name/email matches, but a developer using a pseudonym on a new machine will be treated as two separate authors unless explicitly merged in `.git-arch-identities`.
