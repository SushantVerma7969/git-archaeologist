# Ownership Metric Audit

## Finding

TensorFlow reports Dmitri Latushko as owner of 36,259 files despite only 42 commits.

## Investigation

Ownership output:

- Dmitri Latushko
- 42 commits
- 36,259 files primarily owned

Typical file ownership entries:

- ownershipPercent = 100
- changes = 2

Git history shows the commits are primarily large-scale security fixes rather than long-term subsystem ownership.

Examples include:

- Fix out-of-bounds read
- Fix heap overflow
- Fix integer overflow
- Fix type confusion

## Conclusion

Current ownership calculation is commit-touch based.

A contributor becomes the owner of a file if they have the highest commit count on that file.

This does not necessarily represent actual code ownership.

Large-scale security fixes, migrations, repository-wide refactors, formatting sweeps, and automation-driven updates can dominate ownership results.

## Future Work

- Compare commit-touch ownership with git blame ownership.
- Compare commit-touch ownership with line ownership.
- Investigate weighted ownership models.
- Measure divergence between commit-touch ownership and line ownership on large repositories.
