# Recency Study Findings

This report summarizes observed results from `research/recency-study/master-recency-study.json`, `category-analysis.json`, and `case-studies.md`. It reports commit-touch concentration as defined by the frozen protocol; it does not infer code ownership, expertise, or maintainership.

## 1. Dataset Overview

- Repositories analyzed: 25
- Scope rows analyzed: 359
- Eligible comparison scopes: 249
- Scopes excluded from eligible-category percentages: 110 (69 with no recent activity; 41 with insufficient recent evidence).
- Repositories present: angular, deno, django, docker-compose, elasticsearch, express, golang, kafka, kubernetes, laravel, nestjs, nextjs, nginx, nodejs, rails, react, redis, remix, spring-boot, svelte, tensorflow, vite, vscode, vue2, vue3.

## 2. Category Distribution

| Category | Scopes | % All Scopes | % Eligible Scopes | Median Recent Touches | Median Lifetime Touches | Median Recent Concentration | Median Lifetime Concentration | Median Recent Bus Factor | Median Lifetime Bus Factor |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Persistent concentration | 144 | 40.11 | 57.83 | 206.5 | 254 | 0.7748 | 0.7815 | 1 | 1 |
| Historical concentration | 10 | 2.79 | 4.02 | 60.5 | 1354 | 0.3649 | 0.6275 | 2 | 1 |
| Emerging concentration | 12 | 3.34 | 4.82 | 45 | 269 | 0.631 | 0.3524 | 1 | 2 |
| Persistently distributed | 83 | 23.12 | 33.33 | 172 | 827 | 0.3333 | 0.3033 | 2 | 3 |
| No recent activity | 69 | 19.22 | N/A | 0 | 111 | 0 | 0.6635 | 0 | 1 |
| Insufficient recent evidence | 41 | 11.42 | N/A | 4 | 13 | 1 | 0.7344 | 1 | 1 |

Persistent concentration is the largest eligible category: 144 scopes, or 57.83% of eligible scopes. Persistently distributed scopes account for 83 scopes, or 33.33% of eligible scopes. Historical and emerging concentration are smaller categories, with 10 and 12 scopes respectively.

## 3. Persistent Concentration Findings

Persistent concentration appears in 144 scopes (40.11% of all scopes; 57.83% of eligible scopes). The median lifetime concentration is 0.7815, and the median recent concentration is 0.7748. Median bus factor remains 1 in lifetime and 1 in recent analysis.
Within this category, 7 scopes have a top identity change, 3 have risk increases, and 4 have risk decreases.

## 4. Historical Concentration Findings

Historical concentration appears in 10 scopes (2.79% of all scopes; 4.02% of eligible scopes). Median concentration decreases from 0.6275 over lifetime history to 0.3649 in the recent window. Median bus factor changes from 1 to 2.
All 10 historical-concentration scopes have bus-factor changes and risk decreases under the study flags. 5 of them have top identity changes.

Largest historical-concentration case-study scopes by lifetime touches:

| Repository | Scope | Category | Lifetime Touches | Recent Touches | Lifetime Concentration | Recent Concentration |
|------------|--------|----------|------------------|----------------|------------------------|----------------------|
| golang | test | Historical concentration | 3990 | 548 | 0.8459 | 0.2062 |
| vite | packages | Historical concentration | 2454 | 1399 | 0.6361 | 0.4875 |
| react | compiler | Historical concentration | 2089 | 452 | 0.5912 | 0.3850 |
| express | (root) | Historical concentration | 2042 | 26 | 0.8149 | 0.2692 |
| nestjs | integration | Historical concentration | 1996 | 177 | 0.6728 | 0.4026 |

## 5. Emerging Concentration Findings

Emerging concentration appears in 12 scopes (3.34% of all scopes; 4.82% of eligible scopes). Median concentration rises from 0.3524 over lifetime history to 0.631 in the recent window. Median bus factor changes from 2 to 1.
All 12 emerging-concentration scopes have bus-factor changes and risk increases under the study flags. 5 of them have top identity changes.

Largest emerging-concentration case-study scopes by recent touches:

| Repository | Scope | Category | Lifetime Touches | Recent Touches | Lifetime Concentration | Recent Concentration |
|------------|--------|----------|------------------|----------------|------------------------|----------------------|
| kubernetes | vendor | Emerging concentration | 74803 | 3408 | 0.1318 | 0.5487 |
| vscode | test | Emerging concentration | 5201 | 1344 | 0.1755 | 0.6719 |
| rails | actioncable | Emerging concentration | 2230 | 203 | 0.1318 | 0.6256 |
| docker-compose | (root) | Emerging concentration | 300 | 113 | 0.4567 | 0.5044 |
| react | scripts | Emerging concentration | 238 | 113 | 0.3109 | 0.5841 |

## 6. Identity-Change Observations

- Persistent concentration: 7 of 144 scopes have `top_identity_changed` (4.86%).
- Historical concentration: 5 of 10 scopes have `top_identity_changed` (50.00%).
- Emerging concentration: 5 of 12 scopes have `top_identity_changed` (41.67%).
- Persistently distributed: 38 of 83 scopes have `top_identity_changed` (45.78%).
- No recent activity: 4 of 69 scopes have `top_identity_changed` (5.80%).
- Insufficient recent evidence: 23 of 41 scopes have `top_identity_changed` (56.10%).

Top identity changes are most common by count in persistently distributed scopes (38 scopes). Historical concentration and emerging concentration each include 5 and 5 top identity changes respectively.

## 7. Threats to Validity

- The analysis measures commit-touch concentration, not ownership, expertise, maintainership, or organizational responsibility.
- Contributor identities are Git author email addresses. Multiple emails for one person remain separate identities, and shared email addresses may combine more than one person.
- Bot filtering is heuristic and depends on the git-archaeologist commit used for the runs.
- Top-level directories are not equivalent architectural units across repositories.
- Recent windows contain less evidence than lifetime windows. The protocol separates no recent activity and insufficient recent evidence, but remaining recent categories can still be more volatile.
- Historical paths may include deleted or renamed files. Large migrations, formatting changes, generated updates, and security sweeps can affect file-touch counts.

## 8. Key Takeaways

- Among eligible scopes, persistent concentration is the dominant observed pattern (57.83% of eligible scopes).
- Historical concentration is uncommon in this dataset (10 scopes), but those scopes show lower median recent concentration and higher median recent bus factor than their lifetime values.
- Emerging concentration is also uncommon (12 scopes), but those scopes show higher median recent concentration and lower median recent bus factor than their lifetime values.
- 110 scopes are outside eligible category percentages because they have no recent activity or fewer than ten recent non-bot file touches.
- The observed results support reporting lifetime and recent windows separately; the category split surfaces cases where concentration persists,
weakens, or emerges in the recent window
