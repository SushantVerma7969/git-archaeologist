# git-archaeologist

[![HTML report](./preview.png)](./preview.png)

[![npm](https://img.shields.io/npm/v/git-archaeologist?color=a78bfa&labelColor=1a1d27)](https://www.npmjs.com/package/git-archaeologist) [![license](https://img.shields.io/badge/license-MIT-a78bfa?labelColor=1a1d27)](LICENSE) [![node](https://img.shields.io/badge/node-%3E%3D18-a78bfa?labelColor=1a1d27)](https://nodejs.org)

> Find the most dangerous files in any git repo — before you touch them.

[Install](#install) · [Usage](#usage) · [What it finds](#what-it-finds) · [How scoring works](#how-scoring-works)

---

You inherit a codebase. You touch a file. Three things break that you had no idea were connected.

This tool reads your entire git history and tells you which files are ticking time bombs, who will orphan a whole module when they quit, which files are secretly coupled even though nothing in the code shows it, and who truly owns what right now.

## Install

```bash
npm install -g git-archaeologist
```

## Usage

```bash
git-arch analyze /path/to/repo
git-arch analyze /path/to/repo --since 90d     # only last 90 days of commits
git-arch analyze /path/to/repo --since 2y      # only last 2 years
git-arch analyze /path/to/repo --since 2024-01-01  # since a specific date
git-arch analyze /path/to/repo --html          # dark-themed interactive report
git-arch cursed --top 10                       # just the danger ranking
git-arch analyze /path/to/repo --json          # pipe into other tools
```

## What it finds

Curse score — not just most changed. A file touched 100 times in 6 months by 15 people who never talked scores way higher than one touched 200 times over a decade by the same person. Recency, author chaos, and churn rate combined into one number.

Bus factor per folder — not per repo. Knowing the whole repo has bus factor 2 is useless. Knowing lib/ is orphaned the day one person leaves is something you can act on.

Implicit coupling — files that always change together in the same commit even though nothing in the code connects them. These are your hidden dependencies.

Ownership — who owns the lines alive in HEAD right now, not who created the file or who committed last.

## Tested on Express.js

Express is one of the most downloaded npm packages in history. 230 contributors. 16 years old.

Running git-archaeologist on it takes 3 seconds and finds:

- `lib/response.js` — 128 changes, 53 different authors, curse score 2261. The core HTTP response logic of the framework has been touched by 53 people and nobody fully owns it.
- Bus factor across every module (lib/, test/, examples/, benchmarks/) is 1. One person. The entire project depends on Douglas Christopher Wilson continuing to show up.
- `benchmarks/Makefile` and `benchmarks/run` have been committed together 100% of the time. They have never changed separately. They are one file.

## How scoring works

```
curse_score = changes x log2(authors+1) x exp(-0.5 x age_years) x log2(churn_rate+2)
```

The exponential decay on age means old chaos that stabilized does not show up. Only files actively dangerous right now.

## Requirements

Node.js >= 18 and git >= 2.30. Works on Linux, macOS, and Windows (WSL).

## Contributing

```bash
git clone https://github.com/SushantVerma7969/git-archaeologist.git
cd git-archaeologist
npm install && npm run build
node dist/index.js analyze /any/repo
```

## License

[MIT](LICENSE)
