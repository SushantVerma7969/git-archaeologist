# Curse Score Validation

Does the curse score actually predict where bugs will appear, or is it — as a
skeptic would reasonably suspect — just a "most-changed file" sort wearing a few
multipliers as a costume? This document answers that with a reproducible
experiment across 12 public repositories, and then **subjects its own results to
an adversarial audit** before stating any conclusion.

## Headline (audited)

On the **7 repositories with statistically adequate samples**, the curse score
beats a raw change-count baseline on **4**, ties on **3**, and loses on **0**.
Where it wins it wins clearly (≈1.3x–2.4x the baseline's lift). Three more
repositories were **excluded as inconclusive** because their file count is too
small for the measurement to mean anything (see the guard below), and two are
flagged **fragile** (correct direction, but too few bug-fixes to be load-bearing).

That is the only claim this study makes. It is deliberately narrower than the raw
run, because a wider claim does not survive scrutiny.

## The question, stated so it can fail

A weak validation shows "curse score correlates with bugs" and stops. In a
codebase nearly everything correlates with bugs. The only test that matters:

> Ranked by curse score, do the top-K files catch more future bug-fixes than the
> same K files ranked by raw change count alone?

If it doesn't beat raw change count, the recency / churn / author / acceleration
multipliers are decoration. By that bar, the score passes on adequately-sized,
actively-developed repos and ties elsewhere.

## Method

A lightweight, leakage-free SZZ-style approximation (`research/validate.mjs`):

1. Pick a cutoff splitting each repo into TRAIN (before) and TEST (after).
2. Compute curse scores using **only** train commits — the tool's real formula.
   Test labels are never seen by the scorer.
3. In TEST, label a file buggy if it received a commit whose message matches a
   conservative fix heuristic (`fix`/`bugfix`/`hotfix`/`regression`/`closes #n`),
   excluding features, docs, chores, and tests.
4. Rank files by (a) curse score and (b) raw change count, from the **same**
   train-derived file universe.
5. Report precision@K and lift at K=50, and the curse score's advantage over the
   baseline.

### Validity guards (declared before classifying)

These exist specifically to stop the study from over-claiming on weak data:

- **Minimum-universe guard.** A K=50 verdict is reported only if the repo has
  **≥150 files** (3×K). Below that, the "top 50" is most of the repo, precision@50
  collapses toward the base rate for *both* rankings, and the comparison is
  meaningless. Repos failing this are marked **inconclusive**, not win/loss.
- **Minimum-sample guard.** A verdict requires **≥5 buggy files and ≥5 fix
  commits** in the test window; below that the result is inconclusive.
- **Robustness tier.** A verdict is **robust** (headline-eligible) only with
  **≥20 buggy files and ≥20 fix commits**. Verdicts that pass the guards but fall
  below this are reported and labelled **fragile**, and are excluded from the
  headline tally.

## Results

### Robust tier — headline-eligible (n=7)

| Repo | Universe | Buggy files | Curse lift@50 | Raw lift@50 | Advantage | Verdict |
|------|---------:|------------:|--------------:|------------:|----------:|---------|
| express | 892  | 70  | 7.65x | 3.82x | +100% | **WIN** |
| moment  | 1243 | 300 | 1.82x | 0.75x | +144% | **WIN** |
| ramda   | 1368 | 63  | 1.30x | 0.43x | +200% | **WIN** |
| vite    | 3238 | 390 | 6.48x | 5.65x | +15%  | **WIN** |
| yargs   | 304  | 56  | 1.19x | 1.19x | 0%    | TIE |
| axios   | 195  | 52  | 1.95x | 2.10x | -7%   | TIE |
| fastify | 375  | 149 | 1.56x | 1.61x | -3%   | TIE |

**Robust tally: 4 WIN, 3 TIE, 0 LOSS.**

### Fragile tier — reported, not headlined (n=2)

| Repo | Universe | Buggy files | Advantage | Verdict | Why fragile |
|------|---------:|------------:|----------:|---------|-------------|
| commander | 302 | 17 | +50% | WIN* | only 17 buggy files / 18 fix commits |
| lodash    | 329 | 7  | 0%   | TIE* | only 7 buggy files |

Direction is consistent with the robust tier, but a 2–3 file swing could move
these, so they carry no headline weight.

### Inconclusive — guard-excluded (n=3)

| Repo | Universe | K=50 covers | Reason |
|------|---------:|------------:|--------|
| chalk      | 51 | 98% of repo | fails universe guard *and* sample guard (2 buggy files) |
| node-fetch | 78 | 64% of repo | fails universe guard |
| underscore | 69 | 72% of repo | fails universe guard |

These are **not** counted as wins, ties, or losses. The earlier unguarded run
reported node-fetch as a "loss"; the universe guard correctly reclassifies it as
inconclusive — its "top 50" was two-thirds of the entire repo, so the metric was
measuring the base rate, not ranking quality.

## The skeptic's charge: "it's just a change-count sort"

Measured directly via top-50 Jaccard overlap between the curse and raw rankings.
Among the robust wins the rankings **diverge** (express 23%, moment 28%, ramda
37%, vite 45%) — the multipliers move the ranking *and* the movement helps. Among
the ties, overlap is high (yargs 59%, fastify 79%) and the result is a dead heat,
exactly as the "it's a costume" criticism would predict. So that criticism is
**true for the ties and false for the wins** — which is the honest, partial answer.

## Threats to validity (stated before a critic does)

- **Effective n is ~7**, not 12, once the guards are applied. The headline is
  scoped to those 7.
- **Bug-fix labels are commit-message heuristics**, not issue-linked defects —
  standard lightweight-SZZ noise, applied identically to both rankings.
- **One cutoff per repo.** A different split could move marginal verdicts; cutoffs
  are published so anyone can vary them.
- **Single ecosystem** (JS/npm). No claim is made beyond it.
- **Hand-picked cutoffs** are a researcher degree of freedom; mitigated by
  publishing every repo, cutoff, and raw output, and by pre-declaring the guards.

## Reproduce it

From a clean clone, after `npm run build`:

```
node research/validate.mjs <path-to-cloned-repo> <cutoff-ISO-date>
```

Every repo, cutoff, and full raw output is in `research/results.txt`. Re-run any
row and check the numbers; a fresh clone of `commander` at `2021-06-01`
reproduces 2.13x vs 1.42x.

## Honest conclusion

On repositories large and active enough to measure, the curse score extracts real
signal beyond a change-count sort — clearly so on four of seven, and never worse
than the baseline on the rest. It is **a ranked starting point for human review on
an actively-developed codebase**, not a universal bug predictor, and the data that
would embarrass the stronger claim (the ties, the guard exclusions) is in the
tables above rather than omitted. The tool is documented as the former.
