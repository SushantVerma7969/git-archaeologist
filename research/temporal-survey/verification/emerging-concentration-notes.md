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

## Vite / src

Survey result:

- No recent activity

Manual inspection:

The scope was not abandoned.

A repository-wide monorepo migration moved:

src/

to

packages/vite/src/

Evidence:

Commit:

cb9f750e8

refactor: re-organize into monorepo

Examples from the migration:

- src/client -> packages/vite/src/client
- src/hmrPayload.ts -> packages/vite/src/hmrPayload.ts
- src/node -> packages/vite/src/node

Conclusion:

The reported "No recent activity" result reflects path-level inactivity rather than subsystem inactivity.

This is a confirmed scope-stability limitation caused by repository reorganization.

