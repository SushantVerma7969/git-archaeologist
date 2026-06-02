# ⛏ Git Archaeologist

> I built this because I got burned. Inherited a codebase, touched the wrong file, and broke three things I didn't know were connected. This tool finds those files before you touch them.

[![License: MIT](https://img.shields.io/badge/license-MIT-a78bfa?labelColor=1a1d27)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-a78bfa?labelColor=1a1d27)](https://nodejs.org)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-a78bfa?labelColor=1a1d27)](https://github.com/SushantVerma7969/git-archaeologist/pulls)

![demo](./demo.gif)

---

Most git tools tell you *what* changed.
Git Archaeologist tells you **what's dangerous, who truly owns it, and what silently breaks together** — surfaced automatically from your commit history. One command. Zero config.

---

## What it finds

| | Analysis | What it surfaces |
|---|---|---|
| 💀 | **Cursed Files** | Ranked by instability score — change frequency x author spread x recency decay |
| 🚌 | **Bus Factor** | Per module: how many people leaving would orphan that folder |
| 👑 | **Ownership** | Who truly owns each file by commit share — not just who created it |
| 🔗 | **Implicit Coupling** | Files that always change together — hidden dependencies the architecture never shows you |

---

## Install

    npm install -g git-archaeologist

Or run without installing:

    npx git-archaeologist analyze ./your-repo

---

## Usage

    # Analyze the current directory
    git-arch

    # Analyze any repo by path
    git-arch analyze /path/to/repo

    # Generate a dark-themed HTML report you can share
    git-arch analyze /path/to/repo --html

    # Save HTML to a specific file
    git-arch analyze /path/to/repo --html ./report.html

    # Show only the top N cursed files
    git-arch cursed --top 10

    # Output raw JSON — pipe it into anything
    git-arch analyze /path/to/repo --json

---

## How the scoring works

I didn't want to just count commits. That's too naive. A file touched 100 times over 10 years is completely different from one touched 100 times in 3 months by 15 different people who all misunderstood each other.

So the curse score is:

    score = changes x log2(authors + 1) x recencyWeight x log2(churnRate + 2)

| Factor | What it captures |
|---|---|
| changes | Raw times the file was touched |
| log2(authors + 1) | Author chaos — logarithmic so one extra person doesn't explode the score |
| recencyWeight | Exponential decay — recent danger matters more than old danger |
| log2(churnRate + 2) | Changes per year — velocity matters, not just volume |

**Bus Factor** — per top-level folder, how many contributors account for 50%+ of all changes. Bus factor of 1 means one person leaving makes that folder a black box.

**Coupling** — for every commit touching multiple files, every pair gets a point. Score = co-changes divided by how often each file changes alone. 100% means they are secretly one file pretending to be two.

---

## Real output — Express.js (1,716 commits, 230 contributors)

    lib/response.js     Score: 2261   128 changes, 53 authors   <- the real danger zone
    lib/application.js  Score:  614    58 changes, 22 authors

    lib/     Bus Factor: 1  Single point of failure — Douglas C. Wilson
    test/    Bus Factor: 1  Single point of failure — Douglas C. Wilson

    benchmarks/Makefile  <->  benchmarks/run       100% coupling — secretly one file
    test/regression.js   <->  test/req.accepts.js  100% coupling — always move together

---

## Requirements

- Node.js >= 18
- git >= 2.30
- Works on Linux, macOS, Windows (WSL recommended)

---

## Contributing

Found a bug or have an idea for a better scoring algorithm? Open an issue or send a PR.

    git clone https://github.com/SushantVerma7969/git-archaeologist.git
    cd git-archaeologist
    npm install
    npm run dev -- analyze /path/to/any/repo

---

## License

MIT

---

> If this saved you from a bad refactor or helped you understand a codebase faster — give it a star. It means a lot.
