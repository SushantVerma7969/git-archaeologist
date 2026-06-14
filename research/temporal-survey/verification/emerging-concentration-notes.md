# Verification Notes

## React / compiler

Survey result:

- Lifetime: MEDIUM risk, 61.4% concentration, bus factor 1
- Recent: LOW risk, 30.6% concentration, bus factor 3

Manual inspection:

The compiler scope remained highly active during the recent window.

Observed activity included:

- New compiler functionality
- Validation improvements
- Bug fixes
- Diagnostic infrastructure
- Playground work
- Rust compiler porting work
- Testing and documentation updates

The recent window contains sustained development rather than isolated maintenance commits.

Conclusion:

The reduction in concentration appears consistent with broader contributor participation in an actively developed subsystem.

This remains one of the strongest Historical Concentration examples identified during Phase 1.

---

## Home Assistant / machine

Survey result:

- Lifetime: LOW risk, 46.5% concentration, bus factor 2
- Recent: HIGH risk, 95.7% concentration, bus factor 1

Manual inspection:

Recent activity in the machine scope was limited to a small number of commits.

Observed changes included:

- Docker image build maintenance
- Architecture cleanup
- Build pipeline updates
- Configuration removal

The scope was active, but activity volume was relatively low.

No evidence was found of a large vendor import, mass file regeneration, or repository-wide mechanical rewrite inflating the result.

Conclusion:

The concentration signal appears genuine, although it is based on a small amount of recent activity.

This remains a valid Emerging Concentration example, but should be presented with the context that the recent window contains relatively few commits.

## Vitest / src

Survey result:

- No recent activity

Manual inspection:

The scope was not abandoned.

A repository-wide monorepo migration moved:

src/

to

packages/vitest/src/

Evidence:

Commit:

d6ff0ccb

refactor: move to monorepo

Examples from the migration:

- src/constants.ts -> packages/vitest/src/constants.ts
- src/node/cli.ts -> packages/vitest/src/node/cli.ts
- src/runtime -> packages/vitest/src/runtime
- src/types -> packages/vitest/src/types

Conclusion:

The reported "No recent activity" result reflects path-level inactivity rather than subsystem inactivity.

This is a second confirmed scope-stability limitation caused by repository reorganization.
