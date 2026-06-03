# git-archaeologist

Run one command. Find the time bombs in any codebase.

![demo](./demo.gif)

---

I wrote this after two days tracking a bug that started because I touched a file 53 different people had already destroyed. This tool finds those files before you touch them.

---

## What it does

**Cursed file score** — not just most changed. A file touched 100 times in 6 months by 12 developers who never talked scores way higher than one touched 100 times over 5 years by the same person.

**Bus factor per folder** — not per repo. Knowing the lib/ folder will be orphaned the day Douglas leaves is actionable. Knowing the whole repo has bus factor 2 is useless.

**Implicit coupling** — files that always change together even though nothing in the code connects them. Hidden dependencies. Future outages.

**Ownership** — not who created the file. Who owns the lines still alive in HEAD right now.

---

## Install

```bash
npm install -g git-archaeologist
```

---

## Usage

```bash
# full report
git-arch analyze /path/to/repo

# just cursed files
git-arch cursed --top 10

# shareable HTML report
git-arch analyze /path/to/repo --html

# raw JSON
git-arch analyze /path/to/repo --json
```

---

## What it found on Express.js

Express has 1716 commits and 230 contributors.

`lib/response.js` — 128 changes, 53 authors, curse score 2261. The core of Express. A disaster waiting to happen.

Every single module — lib/, test/, examples/, benchmarks/ — has bus factor 1. One person. Douglas Christopher Wilson. If he stops tomorrow nobody else fully understands any of it.

`benchmarks/Makefile` and `benchmarks/run` have 100% coupling. They are one file pretending to be two.

---

## The formula

```
curse_score = changes x log2(authors+1) x exp(-0.5 x age_years) x log2(churn_rate+2)
```

The exponential decay on age means old chaos that stabilized does not show up. Only current danger.

---

## Run locally

```bash
git clone https://github.com/SushantVerma7969/git-archaeologist.git
cd git-archaeologist
npm install && npm run build
node dist/index.js analyze /any/repo
```

---

MIT. Use it however you want.