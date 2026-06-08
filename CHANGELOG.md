# Changelog

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
