# Curse Score Validation

Does the curse score actually predict where bugs will appear, or is it — as a
skeptic would reasonably suspect — just a "most-changed file" sort wearing a few
multipliers as a costume? This document answers that with a reproducible
experiment rather than an assertion.

The short version: **on actively-developed repositories the curse score predicts
future bug-fix activity well, and beats a raw change-count baseline by roughly
2x. On dormant, monolithic, or uniformly-churning repositories it performs at or
below that baseline.** The score earns its complexity where the tool is meant to
be used, and not everywhere. The honest limitations are stated below, not buried.

## The question, stated so it can fail

A weak validation shows "curse score correlates with bugs" and stops. That proves
almost nothing — in a codebase, nearly everything correlates with bugs, because
files that change a lot have more of everything. The only test that matters is
whether the curse score beats the dumb baseline:

> Ranked by curse score, do the top files catch more future bug-fixes than the
> same number of files ranked by raw change count alone?

If it doesn't beat raw change count, the recency / churn / author / acceleration
multipliers are decoration and should be removed. That is the bar this study
holds the score to.

## Method

A lightweight, leakage-free SZZ-style approximation:

1. **Split history at a cutoff date** into a *train* window (everything before)
   and a *test* window (everything after).
2. **Score using train only.** Curse scores are computed from pre-cutoff commits
   exclusively, using the tool's real `scoreCursedFiles` — the scorer never sees
   the future.
3. **Label from test only.** A file is "buggy" if it received at least one
   *code* bug-fix commit after the cutoff. Bug-fixes are identified from commit
   subjects (`fix`, `bugfix`, `hotfix`, `regression`, `closes #N`) with docs,
   typo, chore, test, lint, and feature commits explicitly excluded — so a
   "fixed typo in README" does not count as a bug.
4. **Compare two rankings** — curse score vs. raw change count — by precision@K,
   lift over the random base rate, and how much the two rankings actually differ.

The full harness is `research/validate.mjs`; raw output is `research/results.txt`.
Reproduce any row with:

```bash
node research/validate.mjs /path/to/cloned/repo 2022-01-01
```

## Results

### Express (active, sustained development) — cutoff 2022-01-01

Stricter code-only bug labels; 49 bug-fix commits in the test window; 7.8% base
rate (a random pick of files would be right 7.8% of the time).

| Top K | Curse precision | Curse lift | Raw precision | Raw lift | Winner |
|------:|----------------:|-----------:|--------------:|---------:|:-------|
|    10 |            100% |     12.7x  |           60% |    7.7x  | curse  |
|    20 |             80% |     10.2x  |           50% |    6.4x  | curse  |
|    50 |             60% |      7.7x  |           30% |    3.8x  | curse  |
|   100 |             45% |      5.7x  |           26% |    3.3x  | curse  |

The curse score's advantage over the raw baseline at K=50 is **+100%**. The two
rankings share under **25%** of their top files — so the multipliers are moving
three-quarters of the ranking, and the movement improves prediction. On this
repo the "it's just a change-count sort" hypothesis is false. The result holds at
a second cutoff (2020-06-01: 90–95% precision at K=10–20).

### Where it does *not* win — and why

The same experiment on two other repos shows the boundary of the claim honestly:

- **axios** (cutoff 2021-06-01): a **tie** with the baseline (+4%). axios's test
  window has a 63.6% bug base rate — when nearly two-thirds of files get fixed,
  ranking barely matters and no method can discriminate. High-churn repos give
  the score little to separate.
- **lodash** (cutoff 2016-01-01, its active period): the baseline **beats** curse
  (raw 10.4x vs curse 7.0x at K=10). For most of its history lodash is a single
  large `lodash.js` monolith, so there is little file-level structure for a
  per-file score to exploit. Monolithic repos blunt the signal.

These are not failures to hide; they define when to trust the number. The curse
score is a useful ranking **conditional on a repo having sustained, differentiated,
multi-file development** — which is the population the tool targets — and adds
little on dormant, monolithic, or uniformly-churning history.

## What this does and does not establish

It establishes that, on its target population, the curse score is a real
predictive signal that outperforms the obvious baseline — not numerology, and not
a change-count sort in disguise.

It does **not** establish a universal law, a causal claim, or a controlled study
across a large repo sample. The bug-fix labels are commit-message heuristics, not
verified defect data; four repositories is a probe, not a corpus. A high curse
score still means *this file is socially complex enough that bugs tend to hide
there* — a place to look first — not *this file is guaranteed buggy*.

## How to extend this

The harness takes any repo and cutoff. Running it across 20–30 repositories, and
replacing the message heuristic with linked issue/defect data, would turn this
probe into a citable result. The method is deliberately simple so that the next
person — including a skeptic — can rerun it and check the claim rather than trust
it.
