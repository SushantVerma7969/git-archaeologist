# Changelog

## [1.32.1] - 2026-06-24

### Fixed
- GitHub Copilot's co-author identity (`copilot@users.noreply.github.com`) is now filtered like a bot, so it is no longer reported as a contributor or owner.

### Added
- 14 regression tests covering the v1.32.0 fixes: pr-risk worst-file scoring and the new-file blast floor, `cursed --top N` honoring N above 20, ownership bot exclusion and identity merging, display-name resolution, and bus-factor non-substitution.
- `.git-arch-identities.example` documenting the merge/split override format.

## [1.32.0] - 2026-06-24

### Fixed
- **pr-risk scores by the worst file, not the average.** A single dangerous file in a large PR is no longer diluted to LOW by trivial files; the headline is the most dangerous file. Also suppresses the blast-radius signal for files with fewer than 3 prior commits (born-together co-change is an artifact, not a dependency). [behavior change]
- **cursed --top N now honors N above 20.** The ranking was capped at 20 in analysis and truncated to 15 in the renderer regardless of --top; both caps are removed.
- **ownership runs the canonical pipeline.** It now merges contributor identities and filters bots (consistent with analyze/risk), and adds --json. The legacy contributor leaderboard and "unowned files" metric were removed. [behavior change]

### Changed
- Command wording tightened to avoid over-claiming what git history measures: blast ("co-change, not a guaranteed dependency"), trend ("more active recently"), and hotspots/MCP/README ("distinct" rather than "independent" signals).

## [1.31.3] - 2026-06-24
- Cleared all dependency vulnerabilities in the GitHub Action by upgrading `@actions/github` and pinning a patched `undici`. The action was rebundled and re-verified end-to-end.
- Trimmed the published npm package: source maps (`.js.map`, `.d.ts.map`) are no longer shipped, cutting the unpacked size from ~376 KB to ~221 KB. Maps are still produced locally for development.
- Added CI-status and monthly-downloads badges to the README.


## [1.31.1] - 2026-06-24
- Fixed the GitHub Action, which could not run. Its manifest pointed at the unbundled `action/index.js`, whose `@actions/*` dependencies are not committed, so a real run failed to resolve them. The action is now bundled into a single self-contained `action/dist/index.js` (via `ncc`) and the manifest points there. Also removed a stray `post:` hook that re-ran the whole action and corrected the output declarations for a JavaScript (node20) action. Verified end-to-end against a real repository.


## [1.31.0] - 2026-06-24
- Added an MCP (Model Context Protocol) server so AI coding agents can query a repository's git history directly. Run `git-arch mcp` to start it over stdio. It exposes five structured-JSON tools — analyze_repo, who_owns, get_bus_factor, find_coupled_files, and get_risk_hotspots — each defaulting to the working directory. The MCP SDK is loaded lazily, so normal CLI usage is unaffected.


## [1.29.1] - 2026-06-24
- Corrected all example numbers in README, BENCHMARKS, and RESEARCH to match current tool output. The previous figures predated the contributor-filtering fix (v1.29.0) and the curse-score scale, and no longer reflected reality — e.g. the README's Express ownership example and the "11 out of 11" validation claim. Numbers are now regenerated against full repo history, marked with their run date, and the validation write-up is reframed as a hand-checked correlation rather than bug prediction.


## [1.29.0] - 2026-06-24
- Fixed a correctness bug where `@users.noreply.github.com` addresses were treated as bots. That address is GitHub's default for any user who keeps their email private, so the rule silently excluded real contributors from ownership, bus-factor, and churn analysis — on React it erased 212 of 1,010 real contributors (21%), including active core maintainers. Genuine automation accounts are still detected via the `[bot]` convention and a known-bot list.
- Hardened git history parsing to use NUL-terminated output (`git log -z`), so a filename containing spaces, newlines, or resembling a timestamp can no longer be misparsed. This removed two duplicated downstream guards that had been filtering corrupt-looking paths by magic value.
- All git invocations now pass arguments as arrays (`execFileSync`) rather than interpolating into a shell string, removing a shell-injection surface on the `--since` value.
- Added the project's first end-to-end integration tests: they build throwaway git repositories and assert on the full analyze() pipeline (test count 47 -> 54).


## [1.28.0] - 2026-06-24
- Identity canonicalization: contributors who commit under multiple emails (e.g. joe@fb.com, joe@meta.com, and the GitHub noreply form) are now merged into a single person before any analysis runs, so ownership concentration and bus factor reflect real people rather than duplicate identities. The merge is conservative by default — it only links identities on strong signals (a shared GitHub noreply handle, or a matching display name *and* email local-part) and never on a common name alone. A new MERGED IDENTITIES section shows exactly what was collapsed, and a `.git-arch-identities` file in the repo root can force merges or splits the heuristic gets wrong.

## [1.27.0] - 2026-06-24
- The implicit coupling table now surfaces genuine hidden dependencies: it excludes test fixtures, snapshots, and non-source paths (which co-change by design), requires at least 5 co-changes as evidence, and breaks score ties by raw co-change count so high-evidence coupling outranks trivially-perfect low-evidence pairs

## [1.26.0] - 2026-06-24
- `git-arch risk --temporal --html` now renders the full temporal picture: a repository evolution summary, an enriched temporal table with concentration delta and trend direction, and a Maintenance Hotspots section matching the terminal ranking
- All user-derived strings in the temporal and hotspot HTML are escaped, closing the injection gap in the previous temporal table
- Tooling, config, and generated scopes (.github, .claude, docs, fixtures, flow-typed, vendor, (root), etc.) are now excluded from every risk view — temporal risk, contributor churn, ownership transitions, abandoned scopes, the bus-factor table, and the codebase treemap — via one shared scope filter, so the whole report reports the same set of source scopes
- Added a note clarifying that a declining lifetime trend does not mean a scope is low-risk today
- The `analyze` ownership table now surfaces genuine concentration: files need real history (5+ changes) and more than one contributor, are ranked by the dominant contributor's volume rather than raw percent, and exclude non-source paths — so it shows meaningfully owned files with their co-contributors instead of trivial single-touch fixtures

## [1.25.0] - 2026-06-24
- Added `git-arch risk --hotspots` — ranks scopes by how many independent maintenance-risk signals fired (bus factor, contributor churn, owner inactivity, rising concentration, ownership transitions)
- Hotspots are an explainable aggregation of existing signals: each fired signal carries its own evidence string, and ranking is by signal count (tie-broken by concentration), not an opaque weighted score
- `--hotspots --all` lowers the threshold to show single-signal scopes; `--hotspots --json` emits machine-readable output
- Output keeps the investigation-prompt framing and makes no ownership or maintainership claims

## [1.24.1] - 2026-06-24
- Synced package.json version with the release tag history (was stale at 1.11.0)

## [1.7.0] - 2026-06-09
- GitHub Action now posts PR risk score as a comment on every pull request
- PR risk score (0-100) based on cursed files touched and bus factor 1 modules affected
- Added `github-token` input to action.yml
- README reframed — outcomes over metrics

## [1.6.0] - 2026-06-09
- Added `git-arch blast <file>` — shows blast radius: every file that historically changes together with the target file, with percentage likelihood

## [1.5.0] - 2026-06-09
- Added `git-arch trend` command — shows which files are getting more active (and more dangerous) compared to the previous 90-day period
- Added RESEARCH.md — validation on Express, React, Vue: 11/11 top cursed files confirmed bug history

## [1.4.4] - 2026-06-08
- Updated preview screenshot with noise-filtered results
- Removed unused demo.gif

## [1.4.3] - 2026-06-08
- Fixed XSS vulnerability in HTML report onclick handlers
- Fixed treemap sizing using getBoundingClientRect
- Fixed TypeScript types in htmlReport (removed any[])
- Fixed maxScore calculation for empty cursed files list
- Removed dead code in highlight function
- Fixed unused fs import in index.ts
- Fixed empty repo crash in orchestrator
- Added --since flag to cursed command
- Replaced --after with --since in git log calls
- Fixed blame author deduplication using email as key

## [1.4.2] - 2026-06-07
- Removed unused dead import in blame.ts
- Fixed spread overflow in blame timestamps
- Fixed action.yml output step reference
- Updated npm keywords for better discoverability
- Removed empty src/utils/ directory
- Switched action to use npx instead of global install
- Updated scoring formula in README to include acceleration

## [1.4.1] - 2026-06-07
- Added GitHub Action for CI integration
- Added git-arch blame <filepath> command for deep file history
- Filtered dist/, .d.ts, .map files from analysis results

## [1.3.1] - 2026-06-06
- Added acceleration detection — files getting worse recently score higher
- Added noise filter — changelogs and lockfiles excluded from curse rankings
- Fixed 5 correctness bugs: stale NOW constant, O(n²) coupling guard, author name resolution, stack overflow on large repos, root filesAtRisk count

## [1.2.1] - 2026-06-05
- Added --since flag for time-bounded analysis (90d, 2y, 2024-01-01)
- Reduced npm package size from 454KB to 23KB

## [1.1.0] - 2026-06-04
- Added interactive D3 treemap HTML report (--html)
- Dark-themed, hover tooltips, color-coded by curse score

## [1.0.0] - 2026-06-03
- Initial release
- Curse score algorithm with exponential decay
- Bus factor per folder
- Implicit coupling detection
- Ownership analysis
