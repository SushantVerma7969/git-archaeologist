# Phase 1 Results

Over the last few days I ran temporal risk analysis across a mix of large and medium-sized open-source repositories to see whether the categories were actually useful outside the repositories used during development.

This isn't a formal study.

The results should be treated as exploratory observations rather than validated research findings.

The goal was simply to answer a practical question:

"Do the temporal categories produce different and believable results when pointed at unfamiliar repositories?"

## Repositories

* React
* FastAPI
* Django
* Vite
* Bun
* Astro
* Vitest
* pnpm
* Electron
* Home Assistant
* Docker Compose
* Nix

Runtime-limited:

* TypeScript
* Rust
* Next.js

## Historical concentration

### React / compiler

Lifetime:

* Medium risk
* 61.4% ownership concentration
* Bus factor 1

Recent:

* Low risk
* 30.6% ownership concentration
* Bus factor 3

The lifetime and recent views produced materially different results for this scope.

### Bun / root

Lifetime:

* Medium risk
* 65.4% ownership concentration
* Bus factor 1

Recent:

* Low risk
* 44.4% ownership concentration
* Bus factor 2

The category matched the underlying numbers. Historical concentration remained visible, while recent activity was less dependent on a single contributor.

### Bun / .vscode

Lifetime:

* Medium risk
* 59.7% ownership concentration
* Bus factor 1

Recent:

* Low risk
* 27.3% ownership concentration
* Bus factor 2

Recent activity appeared substantially more distributed than the lifetime view.

### Bun / misctools

Lifetime:

* Medium risk
* 54.6% ownership concentration
* Bus factor 1

Recent:

* Low risk
* 34.8% ownership concentration
* Bus factor 2

Another example where the recent view differed meaningfully from the lifetime view.

## Emerging concentration

### Home Assistant / machine

Lifetime:

* Low risk
* 46.5% ownership concentration
* Bus factor 2

Recent:

* High risk
* 95.7% ownership concentration
* Bus factor 1

One of the largest lifetime-to-recent shifts observed during the survey.

### Vite / .github

Lifetime:

* Low risk
* 34.6% ownership concentration
* Bus factor 3

Recent:

* High risk
* 82.5% ownership concentration
* Bus factor 1

Recent activity became much more concentrated than the historical view suggested.

### Vitest / examples

Lifetime:

* Low risk
* 36.7% ownership concentration
* Bus factor 2

Recent:

* Medium risk
* 75.0% ownership concentration
* Bus factor 1

The scope appeared broadly distributed historically but concentrated recently.

### Electron / lib

Lifetime:

* Low risk
* 21.4% ownership concentration
* Bus factor 5

Recent:

* Medium risk
* 62.3% ownership concentration
* Bus factor 1

A substantial shift between lifetime and recent analysis.

### React / .github

Lifetime:

* Low risk
* 22.4% ownership concentration
* Bus factor 3

Recent:

* Medium risk
* 77.1% ownership concentration
* Bus factor 1

A clear example of recent concentration emerging despite historically distributed ownership.

## Persistent concentration

### FastAPI

Several major FastAPI scopes remained concentrated in both lifetime and recent views.

Examples included:

* fastapi
* docs
* docs_src
* tests
* root
* .github

Ownership concentration remained high across both windows, and bus factor generally remained at 1.

FastAPI produced multiple persistent-concentration scopes across both lifetime and recent analysis.

## Persistently distributed

### Django

The main Django scopes produced consistently distributed results.

Examples included:

* django
* docs
* tests
* js_tests
* root

Both lifetime and recent analysis remained low risk, with no major concentration patterns emerging.

The main Django scopes remained LOW risk in both lifetime and recent analysis.

## Structural observations

A few repositories produced results that may be worth investigating further.

### Vite

The packages scope remained active while several historical scopes appeared under "No recent activity".

Examples included:

* src
* lib
* test

This may reflect repository evolution over time, but no conclusion was drawn from the survey alone.

### Vitest

A similar pattern appeared where packages remained active while some historical scopes appeared inactive in the recent window.

This observation was recorded for future investigation only.

### Runtime limits

Three repositories did not complete within the survey limits:

* TypeScript
* Rust
* Next.js

These were recorded as runtime-limited results rather than classification results.

## Notes

The survey produced observed examples of:

* Historical concentration
* Emerging concentration
* Persistent concentration
* Persistently distributed
* No recent activity
* Insufficient recent evidence

The survey also surfaced operational limits on very large repositories, with TypeScript, Rust, and Next.js exceeding the selected runtime cap.

The purpose of Phase 1 was not to validate the model statistically. The goal was to determine whether the temporal categories produced distinct and believable outputs when applied to repositories outside the development set.
