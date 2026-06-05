# git-archaeologist

![HTML Report — interactive risk heatmap](./preview.png)

![Terminal demo](./demo.gif)

[![npm](https://img.shields.io/npm/v/git-archaeologist?color=a78bfa&labelColor=1a1d27)](https://www.npmjs.com/package/git-archaeologist)
[![license](https://img.shields.io/badge/license-MIT-a78bfa?labelColor=1a1d27)](LICENSE)
[![node](https://img.shields.io/badge/node-%3E%3D18-a78bfa?labelColor=1a1d27)](https://nodejs.org)

> Dig through your git history and find what's actually dangerous.

[Install](#install) • [Usage](#usage) • [What it finds](#what-it-finds) • [How scoring works](#how-scoring-works)

---

You inherit a codebase. You touch a file. Three things break that you had no idea were connected.

This tool reads your entire git history and surfaces four things: which files are ticking time bombs, who will take a whole module down when they quit, which files are secretly coupled even though nothing in the code shows it, and who truly owns what right now — not who created it.

## Install

```bash
npm install -g git-archaeologist
```

## Usage

```bash
git-arch analyze /path/to/repo
git-arch analyze /path/to/repo --html    # dark-themed shareable report
git-arch cursed --top 10                 # just the danger ranking
git-arch analyze /path/to/repo --json    # pipe into other tools
```

## What it finds

**Cursed file score** — not just most changed. A file touched 100 times in 6 months by 15 people who never talked scores way higher than one touched 200 times over a decade by the same person. Recency, author chaos, and churn rate combined into one number.

**Bus factor per folder** — not per repo. Knowing "the whole repo has bus factor 2" is useless. Knowing "lib/ is orphaned the day Douglas leaves" is something you act on.

**Implicit coupling** — finds pairs of files that always change together in the same commit even though nothing in the code connects them. These are your hidden dependencies.

**Ownership** — who owns the lines alive in HEAD right now, not who created the file or who committed last.

## Tested on Express.js

Express is one of the most downloaded npm packages in history. 230 contributors. 16 years old.

Running git-archaeologist on it takes 3 seconds and finds:

- `lib/response.js` — 128 changes, 53 different authors, curse score 2261. The core HTTP response logic of the framework has been touched by 53 people and nobody fully owns it.
- Bus factor across every module (lib/, test/, examples/, benchmarks/) is 1. One person. The entire project depends on Douglas Christopher Wilson continuing to show up.
- `benchmarks/Makefile` and `benchmarks/run` have been committed together 100% of the time. They have never changed separately. They are one file.

## How scoring works

```
curse_score = changes × log₂(authors+1) × exp(-0.5 × age_years) × log₂(churn_rate+2)
```

The exponential decay on age is the important part. A file that was chaotic 5 years ago and has been stable since will not show up. Only files that are actively dangerous right now.

## Requirements

Node.js >= 18 and git >= 2.30. Works on Linux, macOS, and Windows (WSL).

