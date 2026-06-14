# Recency Study Summary

## Overview

This study examines commit-touch concentration across 25 major open-source repositories using the git-archaeologist analysis framework.

The goal was to compare lifetime repository history with recent repository history to determine whether contributor concentration remains stable over time or changes in meaningful ways.

The study analyzes repository scopes (top-level directories and repository roots) rather than repositories as a whole.

---

## Dataset

* Repositories analyzed: 25
* Scope rows analyzed: 359
* Eligible comparison scopes: 249
* Excluded scopes: 110

  * No recent activity: 69
  * Insufficient recent evidence: 41

Repositories include Angular, Deno, Django, Docker Compose, Elasticsearch, Express, Golang, Kafka, Kubernetes, Laravel, NestJS, Next.js, Nginx, Node.js, Rails, React, Redis, Remix, Spring Boot, Svelte, TensorFlow, Vite, Vue 2, Vue 3, and VS Code.

---

## Methodology

For each scope, the study computes:

* Total non-bot file touches
* Top contributor share (concentration)
* Bus factor
* Risk classification

Two windows are compared:

1. Lifetime history
2. Recent history (commits since 2025-06-13T00:00:00Z)

Scopes are classified into one of six outcomes:

* Persistent concentration
* Historical concentration
* Emerging concentration
* Persistently distributed
* No recent activity
* Insufficient recent evidence

The protocol was frozen before the full dataset was analyzed.

---

## Key Findings

### Persistent concentration dominates

Persistent concentration is the largest eligible category.

* 144 scopes
* 57.83% of eligible scopes

Most concentrated scopes remain concentrated in both lifetime and recent history.

### Historical concentration exists but is uncommon

* 10 scopes
* 4.02% of eligible scopes

These scopes were historically concentrated but became more distributed recently.

### Emerging concentration also exists

* 12 scopes
* 4.82% of eligible scopes

These scopes became more concentrated in recent history than in lifetime history.

### Excluded scopes matter

110 scopes lacked enough recent evidence for direct comparison.

Separating these scopes avoids over-interpreting limited recent activity.

---

## Representative Examples

### Historical Concentration

* Golang `test`
* Vite `packages`
* React `compiler`

These scopes show concentration weakening in the recent window.

### Emerging Concentration

* Kubernetes `vendor`
* VS Code `test`
* React `scripts`

These scopes show concentration increasing in the recent window.

### Persistent Concentration

* Node.js `deps`
* Spring Boot `spring-boot-project`
* TensorFlow `tensorflow`

These scopes remain highly concentrated across both lifetime and recent windows.

---

## Limitations

The study measures commit-touch concentration only.

It does not directly measure:

* Ownership
* Expertise
* Maintainership
* Code review activity
* Design influence
* Non-code project work

Contributor identities are based on Git author email addresses and may be affected by identity fragmentation.

Bus-factor and concentration metrics should be interpreted as maintenance-activity signals rather than complete descriptions of project ownership.

---

## Reproducibility

The protocol, thresholds, repository snapshots, and tool version are documented.

The study can be reproduced using the published methodology and frozen analysis configuration.

---

## Final Conclusion

The dominant pattern in this dataset is persistent contributor concentration.

However, comparing lifetime and recent history reveals meaningful cases where concentration weakens or emerges over time.

Reporting both windows provides a more complete picture of maintenance activity distribution than lifetime-only reporting.
