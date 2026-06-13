# Commit-Touch Concentration Across Lifetime and Recent Repository History

## 1. Abstract

This study compares lifetime and recent maintenance-activity concentration across 25 software repositories. The unit of analysis is the top-level repository scope: each top-level directory is treated as a scope, and files at the repository root are assigned to the `(root)` scope. The study measures commit-touch concentration, not code ownership, expertise, maintainership, or organizational responsibility.

The dataset contains 359 scope rows. Of these, 249 scopes are eligible for lifetime-versus-recent comparison, while 110 scopes are excluded from eligible-category percentages because they have no recent activity or insufficient recent evidence. Among eligible scopes, persistent concentration is the dominant observed pattern: 144 scopes, or 57.83% of eligible scopes, are concentrated in both lifetime and recent windows. Persistently distributed scopes account for 83 scopes, or 33.33% of eligible scopes. Historical concentration appears in 10 scopes, and emerging concentration appears in 12 scopes.

The results motivate reporting lifetime and recent windows separately. Historical concentration and emerging concentration are both uncommon in this dataset, but they identify scopes where lifetime-only reporting would obscure recent change in concentration, bus factor, or leading identity.

## 2. Introduction

Repository history is often used to reason about how maintenance activity is distributed. However, lifetime history and recent history can tell different stories. A scope may have been historically concentrated but become more distributed, or it may have been historically distributed while recent activity has become concentrated. A single lifetime-only measurement can therefore hide temporal changes in commit-touch concentration.

This study addresses that problem by comparing two windows for each analyzed scope: lifetime history and recent history. The goal is to distinguish scopes where historical concentration persists from scopes where concentration has weakened, emerged recently, or remained distributed. The study intentionally limits its claims to commit-touch concentration. It does not infer ownership, maintainership, expertise, or organizational responsibility from commit history.

The study uses a fixed recent-period cutoff of `2025-06-13T00:00:00Z`. This absolute UTC cutoff avoids dependence on local timezone or execution date. For each scope, the study classifies the relationship between lifetime and recent concentration into one of six comparison categories: persistent concentration, historical concentration, emerging concentration, persistently distributed, no recent activity, or insufficient recent evidence.

## 3. Methodology

The primary unit of analysis is the top-level scope. Each top-level directory is a scope, and files at the repository root belong to the `(root)` scope. Scope-level analysis is primary because repository-wide aggregation can hide concentrated maintenance activity within individual modules. Repository-level reporting summarizes the number and percentage of scopes in each category, but it does not introduce repository-wide owner or commit-share metrics.

For each eligible scope and analysis window, the study computes total non-bot file touches, top contributor share, and bus factor. A file touch is one analyzed commit touching one historical file path. Contributor identities are Git author email addresses. Display names are used only as presentation labels, and identities are not merged when display names match. Bot identities are excluded before calculating contributor counts, commit-touch concentration, and bus factor, using the bot filtering implemented by the analyzed git-archaeologist commit.

The lifetime window includes all history available from the checked-out repository snapshot. The recent window includes commits from `2025-06-13T00:00:00Z` through the checked-out repository snapshot. Each repository uses the same checked-out commit for both windows.

The study uses the existing risk thresholds without adjustment. A scope is classified as `HIGH` risk when bus factor is 1 and top contributor share is at least 80%. It is classified as `MEDIUM` risk when bus factor is 1, or when bus factor is 2 and top contributor share is at least 50%. All other eligible scopes are classified as `LOW` risk. For this study, `HIGH` and `MEDIUM` are considered concentrated, and `LOW` is considered distributed.

Each scope receives exactly one comparison category:

| Lifetime classification | Recent classification | Category |
|---|---|---|
| Concentrated | Concentrated | Persistent concentration |
| Concentrated | Distributed | Historical concentration |
| Distributed | Concentrated | Emerging concentration |
| Distributed | Distributed | Persistently distributed |
| Any | No touches | No recent activity |
| Any | Fewer than 10 touches | Insufficient recent evidence |

Recent scopes with activity but fewer than ten non-bot file touches are classified as insufficient recent evidence rather than concentrated or distributed. Orthogonal flags provide additional context without changing a scope's category: `top_identity_changed`, `bus_factor_changed`, `risk_level_increased`, `risk_level_decreased`, and `identity_fragmentation_suspected`.

The protocol was calibrated with Express and React before the full research set was reviewed. The acceptance gate required confirming that bots were absent from contributor rankings, manually verifying top-share arithmetic for one Express scope and one React scope, confirming bus-factor calculation against the 50% threshold, confirming that Express and React produced meaningfully different comparison patterns, confirming that raw outputs and metadata were retained, and freezing protocol thresholds before reviewing other repositories.

## 4. Dataset

The study analyzes 25 repositories: angular, deno, django, docker-compose, elasticsearch, express, golang, kafka, kubernetes, laravel, nestjs, nextjs, nginx, nodejs, rails, react, redis, remix, spring-boot, svelte, tensorflow, vite, vscode, vue2, and vue3.

The dataset contains 359 scope rows. Of these, 249 scopes are eligible comparison scopes. The remaining 110 scopes are excluded from eligible-category percentages: 69 have no recent activity, and 41 have insufficient recent evidence.

The category-level distribution is:

| Category | Scopes | % All Scopes | % Eligible Scopes | Median Recent Touches | Median Lifetime Touches | Median Recent Concentration | Median Lifetime Concentration | Median Recent Bus Factor | Median Lifetime Bus Factor |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Persistent concentration | 144 | 40.11 | 57.83 | 206.5 | 254 | 0.7748 | 0.7815 | 1 | 1 |
| Historical concentration | 10 | 2.79 | 4.02 | 60.5 | 1354 | 0.3649 | 0.6275 | 2 | 1 |
| Emerging concentration | 12 | 3.34 | 4.82 | 45 | 269 | 0.631 | 0.3524 | 1 | 2 |
| Persistently distributed | 83 | 23.12 | 33.33 | 172 | 827 | 0.3333 | 0.3033 | 2 | 3 |
| No recent activity | 69 | 19.22 | N/A | 0 | 111 | 0 | 0.6635 | 0 | 1 |
| Insufficient recent evidence | 41 | 11.42 | N/A | 4 | 13 | 1 | 0.7344 | 1 | 1 |

At the repository level, persistent concentration percentages vary substantially among eligible scopes. TensorFlow has 5 eligible scopes and all 5 are persistent concentration. Angular has 17 eligible scopes, of which 16 are persistent concentration. Spring Boot has 24 eligible scopes, of which 22 are persistent concentration. Elasticsearch has 19 eligible scopes, of which 17 are persistent concentration. At the other end of the sorted repository summary, Golang, Kubernetes, Laravel, Rails, and Vue 2 have no persistent-concentration scopes among eligible scopes; Vue 2 has no eligible scopes because all 12 scopes have no recent activity.

## 5. Results

Persistent concentration is the largest eligible category. It appears in 144 scopes, representing 40.11% of all scopes and 57.83% of eligible scopes. Within this category, median lifetime concentration is 0.7815 and median recent concentration is 0.7748. Median bus factor remains 1 in both lifetime and recent analysis. The category includes 7 scopes with top identity changes, 3 with risk increases, and 4 with risk decreases.

Persistently distributed scopes are the second-largest eligible category. They account for 83 scopes, or 23.12% of all scopes and 33.33% of eligible scopes. Their median recent concentration is 0.3333, and their median lifetime concentration is 0.3033. Median bus factor is 2 in the recent window and 3 in the lifetime window.

Historical concentration is uncommon in this dataset. It appears in 10 scopes, or 2.79% of all scopes and 4.02% of eligible scopes. In these scopes, median concentration decreases from 0.6275 in lifetime history to 0.3649 in the recent window. Median bus factor changes from 1 to 2. All 10 historical-concentration scopes have bus-factor changes and risk decreases under the study flags, and 5 have top identity changes.

Emerging concentration is also uncommon. It appears in 12 scopes, or 3.34% of all scopes and 4.82% of eligible scopes. In these scopes, median concentration rises from 0.3524 over lifetime history to 0.631 in the recent window. Median bus factor changes from 2 to 1. All 12 emerging-concentration scopes have bus-factor changes and risk increases under the study flags, and 5 have top identity changes.

Top identity changes differ by category. Persistent concentration includes 7 of 144 scopes with `top_identity_changed` (4.86%). Historical concentration includes 5 of 10 scopes (50.00%). Emerging concentration includes 5 of 12 scopes (41.67%). Persistently distributed scopes include 38 of 83 scopes (45.78%). No recent activity includes 4 of 69 scopes (5.80%), and insufficient recent evidence includes 23 of 41 scopes (56.10%).

The repository summary shows that several repositories have high persistent-concentration percentages among eligible scopes. TensorFlow is at 100.00%, Angular at 94.12%, Spring Boot at 91.67%, Elasticsearch at 89.47%, Svelte at 85.71%, and Next.js at 84.21%. Other repositories are dominated by distributed or excluded categories. Rails has 17 eligible scopes, of which 16 are persistently distributed. Kubernetes has 31 total scopes, but only 11 eligible scopes; of those, 9 are persistently distributed and 2 are emerging concentration. Laravel has 19 total scopes, 4 eligible scopes, and 12 scopes with no recent activity.

These results show why eligible and excluded scopes are reported separately. The 110 excluded scopes are not treated as evidence for recent concentration or distribution. They are retained as observations about activity level and evidence sufficiency, while the eligible denominator is used for concentration-category percentages.

## 6. Case Studies

The case-study selection rules identify historical-concentration scopes by lifetime touches and emerging-concentration scopes by recent touches. These cases illustrate how the comparison categories highlight temporal differences between lifetime and recent windows.

For historical concentration, the largest case-study scope by lifetime touches is Golang `test`. It has 3990 lifetime touches and 548 recent touches. Its lifetime concentration is 0.8458646616541353, while recent concentration is 0.2062043795620438. Its bus factor changes from 1 to 5, and the top identity changes.

Vite `packages` is another historical-concentration case. It has 2454 lifetime touches and 1399 recent touches. Its lifetime concentration is 0.6361043194784026, and its recent concentration is 0.4874910650464618. Its bus factor changes from 1 to 2, while the top identity does not change. Vite `docs` follows a similar category pattern, with 712 lifetime touches, 486 recent touches, lifetime concentration of 0.6067415730337079, recent concentration of 0.4897119341563786, and bus factor changing from 1 to 2.

React `compiler` is classified as historical concentration. It has 2089 lifetime touches and 452 recent touches. Its concentration decreases from 0.5911919578745811 to 0.38495575221238937, bus factor changes from 1 to 2, and the top identity changes. Express `(root)` is also historical concentration, with 2042 lifetime touches and 26 recent touches; concentration decreases from 0.8148873653281097 to 0.2692307692307692, bus factor changes from 1 to 2, and the top identity changes.

For emerging concentration, Kubernetes `vendor` is the largest case-study scope by recent touches. It has 74803 lifetime touches and 3408 recent touches. Its lifetime concentration is 0.1317727898613692, and its recent concentration is 0.5487089201877934. Its bus factor changes from 10 to 1, while the top identity does not change.

VS Code `test` is another emerging-concentration case. It has 5201 lifetime touches and 1344 recent touches. Its concentration rises from 0.17554316477600462 over lifetime history to 0.671875 in the recent window, and its bus factor changes from 5 to 1. Rails `actioncable` also shows emerging concentration, with 2230 lifetime touches and 203 recent touches. Its concentration rises from 0.13183856502242153 to 0.625615763546798, bus factor changes from 7 to 1, and the top identity changes.

Smaller emerging-concentration cases include docker-compose `(root)` and React `scripts`, both with 113 recent touches. Docker-compose `(root)` has lifetime concentration of 0.45666666666666667 and recent concentration of 0.504424778761062, with bus factor changing from 2 to 1. React `scripts` has lifetime concentration of 0.31092436974789917 and recent concentration of 0.584070796460177, also with bus factor changing from 2 to 1.

## 7. Threats To Validity

The study measures commit-touch concentration, not ownership, expertise, maintainership, or organizational responsibility. Commit activity is an observable historical signal, but it should not be interpreted as a complete account of responsibility or knowledge.

Contributor identities are Git author email addresses. Multiple emails belonging to one person remain separate identities, and shared email addresses may combine more than one person. Display-name similarity is not used to merge identities. As a result, identity fragmentation can affect contributor counts, concentration, and bus factor.

Bot filtering is heuristic and depends on the git-archaeologist commit used for the runs. Project-specific automation may be missed, and bot-detection behavior may change across tool versions. The protocol requires recording the tool commit because of this dependency.

Top-level directories are not equivalent architectural units across repositories. A top-level scope may represent a major subsystem in one repository and a narrow support directory in another. Repository-level summaries therefore report scope counts and percentages, not repository-wide owners or commit-share metrics.

The recent window contains less evidence than the lifetime window and is naturally more volatile. The protocol separates no recent activity and insufficient recent evidence from eligible categories, but eligible recent categories can still be affected by the shorter observation window.

Historical paths may include deleted or renamed files, and renamed files may be represented as multiple paths. Large migrations, formatting changes, generated updates, and security sweeps can dominate file-touch counts. Squash merges, rebases, and rewritten history can also affect attribution.

Repository snapshots may end on different dates even though the recent-period cutoff is fixed. The fixed cutoff makes the recent window comparable by start date, but the available endpoint depends on each checked-out repository snapshot.

The eligible-scope dataset may not be representative of all repository scopes. Repositories with little recent activity contribute more no-recent-activity and insufficient-evidence scopes, while more actively maintained repositories contribute a larger share of eligible scopes. As a result, eligible-scope percentages describe scopes with sufficient recent activity under this protocol rather than all repository scopes uniformly.

One case-study row (Golang `test`, recent top identity) displays an email address rather than a display name because the parser falls back to email identifiers when display-name metadata is unavailable. This affects presentation only and does not affect concentration, bus-factor, risk, or category calculations.

## 8. Discussion

The main empirical result is that persistent concentration dominates eligible scopes in this dataset. More than half of eligible scopes are concentrated in both lifetime and recent windows. This pattern is especially visible in repositories such as TensorFlow, Angular, Spring Boot, Elasticsearch, Svelte, and Next.js, each of which has a high percentage of persistent-concentration scopes among eligible scopes.

At the same time, the historical and emerging categories show that lifetime-only reporting would miss important temporal differences. Historical concentration captures scopes where concentration weakens in the recent window. Emerging concentration captures scopes where recent activity is more concentrated than lifetime history. Although these categories are small by count, their median concentration and bus-factor shifts are directionally different by definition and by observed category statistics.

The distinction between eligible and excluded scopes is also important. No recent activity and insufficient recent evidence together account for 110 of 359 scopes. Treating these scopes as distributed or concentrated would overstate what the recent window can support. The protocol instead preserves them as separate outcomes, which makes repository-level summaries more interpretable.

Identity-change flags add context but do not determine category membership. Persistent concentration has relatively few top identity changes, while historical concentration, emerging concentration, persistently distributed scopes, and insufficient recent evidence show higher top-identity-change rates. These flags indicate that leading identities can shift independently of whether a scope is classified as concentrated or distributed.

The repository-level summary should be read as a distribution of scope classifications, not as a ranking of maintainership models. A repository with many persistent-concentration scopes is not necessarily organizationally centralized, and a repository with many distributed scopes is not necessarily organizationally decentralized. The study reports commit-touch patterns within available Git history under the stated identity, bot-filtering, and scope definitions.

## 9. Conclusion

This study compares lifetime and recent commit-touch concentration across 359 scopes in 25 repositories. Among 249 eligible scopes, persistent concentration is the dominant observed category, with 144 scopes and 57.83% of eligible scopes. Persistently distributed scopes account for 83 scopes and 33.33% of eligible scopes. Historical concentration appears in 10 scopes, and emerging concentration appears in 12 scopes.

The findings support the study design: lifetime and recent windows should be reported separately because they reveal different concentration patterns. Most eligible scopes that are lifetime-concentrated remain concentrated in the recent window, but some scopes show weakened historical concentration, and others show recently emerged concentration. Separating no recent activity and insufficient recent evidence prevents low-evidence recent windows from being overinterpreted.

The study's conclusions are limited to commit-touch concentration under the frozen protocol. They should not be read as claims about ownership, expertise, maintainership, or organizational responsibility. Within that scope, the observed data show that recency-aware reporting provides a more explicit account under this protocol of how maintenance activity concentration persists, weakens, emerges, or remains distributed across repository scopes.
