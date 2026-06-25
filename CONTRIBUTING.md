# Contributing to git-archaeologist

Thank you for your interest in contributing! This document explains how to develop, test, and submit changes.

## Development Setup

### Prerequisites
- Node.js >= 18
- Git >= 2.30
- npm (comes with Node.js)

### Install & Build

```bash
git clone https://github.com/SushantVerma7969/git-archaeologist.git
cd git-archaeologist
npm install
npm run build
```

### Test Locally

```bash
# Run tests
npm test

# Run CLI from source (during development)
npm run dev analyze /path/to/repo

# Run compiled CLI
node dist/index.js analyze /path/to/repo

# Test a specific command
node dist/index.js risk /path/to/repo
node dist/index.js cursed /path/to/repo
node dist/index.js blame package.json /path/to/repo
```

## Code Structure

```
src/
├── index.ts              # CLI entry point, command registration
├── core/
│   ├── gitParser.ts      # Git history parsing
│   └── orchestrator.ts   # Analysis orchestration
├── analyzers/
│   ├── busFactorAnalyzer.ts
│   ├── curseScorer.ts
│   └── ownershipAnalyzer.ts
├── output/
│   ├── terminalRenderer.ts
│   ├── htmlReport.ts
│   └── formatter.ts
├── [command].ts          # Individual command implementations
│   ├── risk.ts
│   ├── blame.ts
│   ├── blast.ts
│   ├── trend.ts
│   └── ...
└── utils/
    ├── activity.ts       # Contributor activity tracking
    └── botFilter.ts      # Bot account filtering
```

## Making Changes

### 1. Choose Your Work

Pick one of these areas:

- **Bug fixes** — Fix existing issues or edge cases
- **Documentation** — Improve README, RESEARCH.md, or add examples
- **Research** — Extend curse score validation or temporal analysis
- **Performance** — Optimize for large repositories (99k+ files)
- **Testing** — Expand test coverage or add regression tests

### 2. Create a Branch

```bash
git checkout -b feature/your-feature-name
```

Branch naming convention:
- `fix/issue-description` — Bug fixes
- `feature/new-command` — New commands or features
- `docs/improve-readme` — Documentation changes
- `research/extend-validation` — Research extensions
- `perf/optimize-parsing` — Performance improvements

### 3. Make Your Changes

**Guidelines:**
- Follow existing TypeScript conventions
- Keep functions focused and testable
- Comment only non-obvious logic
- Update types if changing data structures
- Add tests for new functionality

**Key Files to Know:**
- Command entry point: `src/index.ts`
- Git parsing: `src/core/gitParser.ts`
- Curse score: `src/analyzers/curseScorer.ts`
- Terminal output: `src/output/terminalRenderer.ts`

### 4. Test Thoroughly

```bash
# Build
npm run build

# Run tests
npm test

# Test on real repositories
node dist/index.js analyze /path/to/express
node dist/index.js risk /path/to/react --temporal
```

### 5. Commit with Clear Messages

```bash
git commit -m "Fix: Correct curse score calculation for empty repos

- Previously crashed on repos with < 2 commits
- Now returns graceful error message
- Added test case for 1-commit repos"
```

**Commit message format:**
- First line: `Type: Brief description` (50 chars max)
  - Types: `Fix`, `Feature`, `Docs`, `Refactor`, `Test`, `Perf`
- Blank line
- Detailed explanation of what and why (wrap at 72 chars)
- Reference issues: `Closes #123`

### 6. Push & Create Pull Request

```bash
git push origin feature/your-feature-name
```

Then open a pull request on GitHub with:
- Clear title describing the change
- Description of what was changed and why
- Reference to any related issues
- Test results or verification steps

## Research Contribution Guidelines

The curse-score validation study is frozen. It lives in `research/`
(`validate.mjs`, the leakage-free SZZ-style harness, and `results.txt`, its raw
multi-repo output) and is written up in [RESEARCH.md](RESEARCH.md). Research
contributions should:

1. **Not modify the frozen study** — `research/validate.mjs` and
   `research/results.txt` back the published claims; leave them intact.
2. **Extend in new directions** — add a new script and result file rather than
   editing the existing ones.
3. **Be clearly scoped** — document methodology, sample size, and limitations
   upfront, in the same honest style as RESEARCH.md.
4. **Include reproducibility** — ship the script, the cutoffs, and the raw
   output so a reviewer can re-run every number.

## Release Process

Once your changes are merged:

1. **Version bump** — Maintainer updates package.json
2. **Update CHANGELOG.md** — Add entry under new version
3. **Tag release** — `git tag vX.Y.Z`
4. **npm publish** — Maintainer publishes to npm registry
5. **GitHub release** — Create release notes from CHANGELOG

## Testing Standards

### Minimum Test Coverage

The suite (`test/`, run with `npm test`) covers git parsing, identity
resolution, bus factor, ownership, curse scoring, risk classification, rename
following, co-author handling, the MCP server, and HTML report generation. New
code should ship with regression tests for the behavior it changes.

- Core algorithms (curse score, bus factor) — required
- Error handling (invalid repos, edge cases) — required
- Output formatting — optional
- CLI parsing — covered by integration tests

### Running Tests

```bash
npm test                          # Run all tests
npm test -- --watch             # Watch mode (if configured)
npm test -- src/analyzers       # Test specific folder
```

## Common Issues & Solutions

### Issue: Build fails with TypeScript errors

**Solution:**
```bash
npm install
npm run build
# If still failing, check Node version: node -v (should be 18+)
```

### Issue: Tests fail on macOS/Windows

**Solution:**
- Git line endings: `git config core.autocrlf` (should be `input` on macOS/Linux)
- Path separators: Use `path.join()` not hardcoded `/`

### Issue: CLI hangs on large repository

**Solution:**
- May be parsing a massive git history
- Try with `--since 1y` to limit scope
- Check available memory: large repos (Kubernetes, VSCode) need 4+ GB

## Documentation

When adding a feature:

1. **Update README.md** — Add command/option to Commands section
2. **Add examples** — Show real usage and expected output
3. **Update RESEARCH.md** (if relevant) — Document any algorithm changes
4. **Add comments** — Explain non-obvious logic in code

## Code Review

All PRs require review before merge. Reviewers will check:

- ✅ Does it solve the stated problem?
- ✅ Are there edge cases or error conditions?
- ✅ Does it follow code conventions?
- ✅ Are there tests? Do they pass?
- ✅ Is the commit history clean?
- ✅ Are documentation and comments clear?

## Questions?

- **Issue tracker:** [GitHub Issues](https://github.com/SushantVerma7969/git-archaeologist/issues)
- **Discussion:** Open an issue with `[question]` prefix
- **Security:** Report privately to maintainer before opening issue

---

## Summary: How to Contribute in 5 Minutes

1. Clone: `git clone https://github.com/SushantVerma7969/git-archaeologist.git && cd git-archaeologist`
2. Setup: `npm install && npm run build`
3. Branch: `git checkout -b feature/your-change`
4. Code: Make your changes in `src/`
5. Test: `npm run build && npm test`
6. Commit: `git commit -m "Type: Your message"`
7. Push: `git push origin feature/your-change`
8. PR: Open pull request on GitHub

Thanks for contributing! 🙏
