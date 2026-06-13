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


## Contributor Identity Interpretation

git-archaeologist computes ownership and bus-factor metrics using Git email identities.

This means contributors are treated as distinct identities when they appear under different email addresses, even if those email addresses belong to the same person.

For example:

* [evan@vuejs.org](mailto:evan@vuejs.org)
* [yyx990803@gmail.com](mailto:yyx990803@gmail.com)

would be counted as two contributor identities because Git records them as separate emails.

Display names are used only for presentation. As a result, output may occasionally show duplicate names in ownership or bus-factor reports when multiple email identities map to the same display name.

Example:

Bus Factor: 2

At-risk contributors:

* Evan You
* Evan You

In this case the calculation is based on two distinct email identities, while the display layer renders both identities using the same contributor name.

This is a presentation ambiguity rather than an arithmetic error.

During investigation this pattern was observed in Vue3 (Evan You), Laravel (Taylor Otwell), and NestJS (Kamil Mysliwiec). NestJS additionally showed display-name variation (including diacritic differences), illustrating that contributor identity fragmentation is not limited to multiple email addresses with identical names.

Any future identity-canonicalization work should be based on email relationships or explicit alias mappings rather than display-name matching. Name-based merging can incorrectly combine unrelated contributors who share a common name while still failing to merge legitimate variants of the same contributor.
