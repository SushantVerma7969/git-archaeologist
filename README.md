# ⛏ Git Archaeologist

**Uncover the hidden history, ownership, and tech debt buried in any git repository.**

[![License: MIT](https://img.shields.io/badge/license-MIT-a78bfa?labelColor=1a1d27)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-a78bfa?labelColor=1a1d27)](https://nodejs.org)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-a78bfa?labelColor=1a1d27)](https://github.com/yourusername/git-archaeologist/pulls)

Most git tools tell you *what* changed.
Git Archaeologist tells you **what's dangerous, who truly owns it, and what silently breaks together** — surfaced automatically from your commit history, with zero config.

---

## Why this exists

Every codebase hides landmines:

- Files touched by 40 different developers that nobody fully understands anymore
- A single engineer who quietly owns 80% of the core logic — one resignation away from a crisis
- Two files that always change together but live in completely different folders — an invisible dependency waiting to cause a bug

---

## What it finds

| | Analysis | What it surfaces |
|---|---|---|
| 💀 | **Cursed Files** | Ranked by instability score — change frequency x author spread x recency decay |
| 🚌 | **Bus Factor** | Per module: how many people leaving would orphan that folder |
| 👑 | **Ownership** | Who truly owns each file by commit share — not just who created it |
| 🔗 | **Implicit Coupling** | Files that always change together — hidden dependencies the architecture doesn't show |

---

## Install

    npm install -g git-archaeologist

Or run once without installing:

    npx git-archaeologist analyze ./your-repo

---

## Usage

    # Analyze the current directory
    git-arch

    # Analyze any repo by path
    git-arch analyze /path/to/repo

    # Generate a dark-themed HTML report
    git-arch analyze /path/to/repo --html

    # Show only the top N cursed files
    git-arch cursed --top 10

    # Output raw JSON for piping into other tools
    git-arch analyze /path/to/repo --json

---

## How the scoring works

**Curse Score** = changes x log2(authors + 1) x recencyWeight x log2(churnRate + 2)

| Factor | Why it matters |
|---|---|
| changes | Raw number of times the file was touched |
| log2(authors + 1) | More authors = more chaos. Logarithmic so it scales fairly |
| recencyWeight | Exponential decay — a file touched yesterday is more dangerous than one untouched for 3 years |
| log2(churnRate + 2) | Changes per year, not just total. 100 changes in 6 months >> 100 changes in 10 years |

**Bus Factor** — groups files by top-level folder. Counts how many contributors account for 50%+ of all changes. Bus factor of 1 = one person leaving orphans the entire module.

**Coupling Score** — for every commit touching multiple files, every pair gets a co-change point. Score = co-changes / max(individual changes). 100% means they always change together.

---

## Real result — Express.js (1,716 commits, 230 contributors)

    lib/response.js     Score: 2261   128 changes, 53 authors   <- real danger zone
    lib/application.js  Score: 614     58 changes, 22 authors

    lib/     Bus Factor: 1  Single point of failure (Douglas C. Wilson)
    test/    Bus Factor: 1  Single point of failure (Douglas C. Wilson)

    benchmarks/Makefile  <->  benchmarks/run       100% coupling
    test/regression.js   <->  test/req.accepts.js  100% coupling

---

## Requirements

- Node.js >= 18
- git >= 2.30
- Works on Linux, macOS, Windows (WSL recommended)

---

## Contributing

Pull requests are welcome. For major changes, open an issue first.

    git clone https://github.com/yourusername/git-archaeologist
    cd git-archaeologist
    npm install
    npm run dev -- analyze /path/to/any/repo

---

## License

MIT — built with intent, not as a homework assignment.

---

> If this saved you from a bad refactor, consider giving it a star.
