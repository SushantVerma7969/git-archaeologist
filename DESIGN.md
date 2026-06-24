# Design Notes

This document explains *why* git-archaeologist computes what it computes — the
shape of the formulas, the constants, and the judgment calls. It is deliberately
honest about which choices are principled and which are tuned by feel, because a
metric you can't explain is a metric no one should trust.

The headline question — "is the curse score real or is it numerology?" — is
answered empirically in [RESEARCH.md](RESEARCH.md). This document covers the
reasoning behind the design; that one covers the evidence that it works.

## The curse score

```
curse_score = changes
            × log2(authors + 1)
            × exp(-0.5 × age_years)
            × log2(churn_rate + 2)
            × acceleration
```

The score ranks files by how much *ongoing maintenance attention* they demand. It
is a within-repo ranking, not an absolute scale — a score is only meaningful
relative to other files in the same repository.

### Why each term has the shape it does

- **`changes` (linear).** The base signal. A file changed 400 times is genuinely
  more maintenance-relevant than one changed 4 times, and the relationship is
  roughly linear, so this term is not dampened. It is the single largest driver,
  which raised the fair objection that the score might be *only* a change-count
  sort. RESEARCH.md tests exactly this and finds the answer is no: on active
  repos the full score beats a raw-change-count baseline by ~2x and shares under
  25% of its top-ranked files with it, so the other four terms materially change
  — and improve — the ranking.

- **`log2(authors + 1)` (dampened).** More distinct authors means more
  coordination cost and more diffuse knowledge, but the effect saturates: the
  difference between 2 and 4 authors matters far more than between 40 and 42. A
  log keeps author count from dominating on huge collaborative files. `+1` keeps
  a single-author file at a defined, non-zero contribution.

- **`exp(-0.5 × age_years)` (exponential decay).** This is the term that
  separates this tool from a plain churn counter. Old chaos that has since gone
  quiet is not today's maintenance risk. The `-0.5` coefficient sets a half-life
  of about 1.4 years (`ln(2)/0.5`): a file untouched for ~1.4 years carries half
  the recency weight, ~2.8 years a quarter, and so on. **This constant is a
  judgment call, not a fitted value.** 1.4 years was chosen as a reasonable
  "still current" horizon for typical project cadence. A faster-moving codebase
  might argue for a shorter half-life and a slower one for longer; the value is
  not claimed to be optimal, only reasonable, and the validation study shows the
  resulting ranking predicts future bug-fixes well at this setting.

- **`log2(churn_rate + 2)` (dampened).** Churn rate is changes per year over the
  file's active span — it distinguishes a file changed 100 times in one year from
  one changed 100 times over a decade. Logged for the same saturation reason as
  authors. `+2` (rather than `+1`) keeps a low-churn file's multiplier above 1.0
  so this term amplifies rather than ever shrinking the score.

- **`acceleration` (clamped ratio).** Recent-6-months changes ÷ prior-6-months
  changes, clamped to `[0.5, 2.0]`. A file getting *worse* lately is a better
  investigation target than one with the same totals that has settled. The clamp
  stops a file that went from 1 to 4 changes (a 4x ratio on tiny numbers) from
  swamping the score — acceleration is a tie-breaker and nudge, not a dominant
  term. The `[0.5, 2.0]` bounds are a judgment call chosen to keep its influence
  to roughly half-to-double.

### Honest status of the constants

Three constants are hand-picked, not fitted: the `-0.5` decay coefficient, the
`[0.5, 2.0]` acceleration clamp, and the `+1`/`+2` smoothing offsets. They were
chosen for defensible reasons (saturation, a reasonable recency horizon, bounded
influence) but were **not** optimized against a labeled dataset.

What changed with [RESEARCH.md](RESEARCH.md) is the posture: previously the
formula was "plausible but unverified." Now the *resulting score* — at these
exact constants — is measured to predict future bug-fix activity on active
repositories, beating the obvious baseline. The constants remain tunable and a
future fitting study could improve them, but the current values are no longer
taken on faith; they produce a ranking that demonstrably works on its target
population. Where it does not work (dormant, monolithic, or uniformly-churning
repos) is documented honestly in RESEARCH.md.

### Structural-noise exclusion

Lockfiles, changelogs, READMEs, and CI configs change constantly without being
maintenance-risky code, and would otherwise dominate the ranking. They are forced
to a score of 0 (`NOISE_PATTERNS` in `curseScorer.ts`). This is a curation choice:
the score is about *code* that demands attention, not about every high-churn path.

## Ownership concentration

Concentration is the top contributor's share of a folder's commit touches
(`top_author_touches / total_touches`). It is intentionally the simplest possible
measure — a single dominant-share ratio, not a Gini coefficient or HHI. The goal
is an interpretable "X% of this folder's history is one person," not a
distribution statistic. Concentration alone is never treated as risk; it is
always paired with **owner activity** (when that person last committed) to
separate active concentration from abandoned concentration, which is the core
idea of the whole tool.

## Bus factor

Computed per top-level folder, not per repo. Authors are ranked by touches and
accumulated until they cross 50% of the folder's changes; the count of authors
needed is the bus factor. The 50% threshold is the conventional "who owns the
majority" line. It is a judgment call: a folder where one person holds 49% reports
bus factor 2 while being effectively single-owned, so the number is a signal to
investigate, not a verdict.

## Co-authored credit

A `Co-authored-by:` trailer gives that person **ownership** credit (they count
toward concentration, bus factor, and contributor sets) but does **not** add to
the change count or timeline that feed the curse score. Rationale: the file
changed once, by N people. Crediting ownership de-biases concentration on
squash-merge and pair-programming workflows where one committer would otherwise
absorb several people's work; leaving the change count alone keeps the curse
score's validated input intact.

## Identity canonicalization

The default is deliberately conservative — it merges only on strong, unambiguous
signals (a shared GitHub noreply handle, or the same non-generic name *and* email
local-part) and never on a shared common name alone. The reasoning: a false
*split* (two rows for one person) is visible and recoverable, while a false
*merge* silently corrupts every downstream metric, and the tool's headline signal
is single-point-of-failure detection that a bad merge would distort. The full
reasoning lives in the header comment of `src/utils/identity.ts`; a
`.git-arch-identities` file lets a user override both directions.

## Rename following

Git detects when a file was renamed (`lib/old.js` → `lib/new.js`). Without
following renames, the two paths read as two separate files, each carrying only
half the history — which halves the change count and distorts the curse score,
concentration, and bus factor of what is really one continuous file. The tool
follows renames by default and folds each historical path onto the file's final
(current) name, so the full history accumulates in one place. Rename chains
(`a → b → c`) resolve transitively to the final name. This is built from a
separate `git log --name-status -M` pass so the main commit/co-author parsing is
untouched, and it is best-effort: if rename detection fails for any reason,
analysis proceeds without it rather than breaking. The effect is invisible on
repos that never renamed source files and meaningful on repos that reorganized —
e.g. it unifies dozens of split histories on a repo with a restructured `src/`.

## Determinism

Recency, acceleration, and activity calculations depend on "now," which makes raw
output time-dependent (a file's recency weight decays continuously). The scoring
path accepts an injectable `now` (defaulting to the wall clock) so analyses can be
pinned to a fixed point — which is what makes the validation study in RESEARCH.md
reproducible, and what enables "as-of" historical analysis. Day-to-day CLI use
still uses the current time by default, because for a maintenance tool, recency
*should* move.
