# git-archaeologist

![demo](./demo.gif)


```bash
npm install -g git-archaeologist
```


## The problem

You inherit a codebase. You touch a file. Three things break that you had no idea were connected.

This tool reads your git history and tells you which files are ticking time bombs, who will take an entire module down when they quit, and which files are secretly coupled even though nothing in the code shows it.


## Usage

```bash
git-arch analyze /path/to/repo
git-arch analyze /path/to/repo --html   # saves a shareable dark-themed report
git-arch cursed --top 10                # just the danger ranking
git-arch analyze /path/to/repo --json   # pipe into other tools
```


## What it outputs

**Cursed files** - ranked by instability score. Not just most changed. A file touched 100 times in 6 months by 15 different developers scores way higher than one touched 200 times over a decade by the same person.

**Bus factor per folder** - not per repo. Knowing the whole repo has bus factor 2 is useless. Knowing lib/ will be orphaned the day one person leaves is something you can act on.

**Implicit coupling** - files that always change together in the same commit even though nothing in the code connects them. Hidden dependencies. Future bugs.

**Ownership** - who owns the lines alive in HEAD right now. Not who created the file. Not who committed most recently.


## Tested on Express.js

Express is one of the most downloaded npm packages ever. 230 contributors. 16 years old.

`lib/response.js` - 128 changes, 53 different authors, curse score 2261. The core HTTP response logic of Express has been touched by 53 people and nobody fully owns it.

Bus factor across every single module - lib/, test/, examples/, benchmarks/ - is 1. One person. Douglas Christopher Wilson. The entire project depends on one human being continuing to show up.

`benchmarks/Makefile` and `benchmarks/run` have 100% coupling. They have never been committed separately. They are one file split across two paths for no reason.


## The scoring formula

```
score = changes x log2(authors + 1) x exp(-0.5 x age_in_years) x log2(churn_rate + 2)
```

The exponential decay on age is intentional. Old chaos that stabilized does not show up. Only files that are actively dangerous right now.


## Requirements

Node >= 18, git >= 2.30


## License

MIT