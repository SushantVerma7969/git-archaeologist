# Validation Notes — does the curse score point at the right files?

The curse score combines change frequency, author spread, recency, churn, and acceleration into a single within-repo ranking. This note records a small, honest check of whether the files it ranks highest are the files a maintainer would actually call risky — and is explicit about what this check does *not* show.

## What this is, and is not

This is a **hand-checked correlation on a handful of files in three repositories**. It is not a controlled study, it has no holdout, and the "bug history" judgement is made by a human reading issue trackers, which is subjective. Treat everything below as a sanity check, not evidence of predictive power. The honest claim is narrow: *the top-ranked files are the heavily-contested, heavily-changed core files of each project* — which is what the score is designed to surface.

## Method

1. Clone the full history of each repo.
2. Run `git-arch analyze --json` and take the top curse-scored files.
3. For each, check whether it is a file with substantial public bug-and-fix history.

Curse scores are a **within-repo ranking only**. A score of 23,507 in Express is not comparable to a score of 11,175 in Vue — the scale depends on the size and age of each repo's history. Do not compare scores across repositories.

## Results

All numbers from a June 2026 run against full history. Reproduce with `git-arch analyze <repo> --json`.

### Express (902 files scanned)

| File | Curse score | Authors | Changes | Notes |
|------|-------------|---------|---------|-------|
| lib/response.js | 23,507 | 80 | 392 | Response methods — the densest bug-and-fix area in Express |
| lib/application.js | 7,356 | 41 | 180 | App configuration and settings |
| lib/request.js | 6,207 | 26 | 176 | Request parsing and proxy handling |

### React (24,012 files scanned)

| File | Curse score | Authors | Changes | Notes |
|------|-------------|---------|---------|-------|
| forks/ReactFeatureFlags.www.js | 22,801 | 52 | 497 | Feature-flag forks — historically a source of behaviour drift between builds |
| forks/ReactFeatureFlags.test-renderer.www.js | 17,808 | 47 | 428 | Test-renderer flag fork |
| forks/ReactFeatureFlags.native-fb.js | 16,548 | 50 | 446 | Native build flag fork |

Note that React's top curse files are the **feature-flag forks** — files that change constantly as flags are added and rolled out. This is a useful illustration of the score's limits: high churn does not always mean "dangerous logic." It means "changes a lot," which for flag files is expected. The score is a starting point for a human to interpret, not a verdict.

### Vue 3 Core (1,320 files scanned)

| File | Curse score | Authors | Changes | Notes |
|------|-------------|---------|---------|-------|
| runtime-core/src/component.ts | 11,175 | 50 | 340 | Component lifecycle — a recurring issue area |
| runtime-core/src/vnode.ts | 10,707 | 38 | 224 | Virtual-node creation and patching |
| reactivity/src/ref.ts | 7,464 | 52 | 156 | `ref()` edge cases are a frequently reported category |

## What this suggests

The top-ranked files are, in every case, core files with heavy contributor spread and heavy change history. In Express and Vue they line up well with areas that attract bug reports. In React, the top files are flag forks — high-churn by design — which is a reminder that the score measures *social and historical complexity*, not code quality directly.

So the honest framing: the curse score is a useful **attention-directing signal** — it reliably surfaces the files many hands have churned hardest — but it does **not predict bugs**, and a high score can simply mean "this file changes often for boring reasons." Always read the file's context before drawing a conclusion.

## Limitations

- Correlation, not causation. High-curse files may attract bugs because they are core files, not because of the factors the score measures.
- Tiny sample (3 repos, ~9 files), no holdout, subjective bug-history judgement.
- The React result shows a clear false-positive mode (flag forks), which a larger study would need to account for.
- A rigorous version would require automated issue-to-file linking across hundreds of repos.

## Reproducing

```bash
git clone https://github.com/expressjs/express
git-arch analyze ./express --json | jq '.cursedFiles[:3]'
```

Run it on your own repositories — the ranking is only meaningful relative to the repo it came from.
