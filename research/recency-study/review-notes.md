# Recency Study Document Review Notes

Reviewed files:

- `research/recency-study/paper.md`
- `research/recency-study/findings.md`
- `research/recency-study/case-studies.md`
- `research/recency-study/repository-summary.md`

Reference data:

- `research/recency-study/master-recency-study.json`

This review checked reported values against the completed master JSON. It did not rerun repository analyses.

## Summary

No numerical inconsistencies were found in the reviewed category counts, percentages, medians, identity-change counts, case-study rows, or repository-summary rows. The main issues are presentation and wording: `findings.md` contains two malformed Markdown tables, and several conclusions would be stronger if they explicitly stayed within the observed commit-touch data and eligible-scope denominator.

## Numerical Consistency

- `paper.md` category totals match `master-recency-study.json`: 359 total scopes, 249 eligible scopes, 110 excluded scopes, 69 no-recent-activity scopes, and 41 insufficient-evidence scopes.
- `findings.md` category totals and percentages match the master JSON: persistent concentration 144 / 40.11% all / 57.83% eligible; historical concentration 10 / 2.79% all / 4.02% eligible; emerging concentration 12 / 3.34% all / 4.82% eligible; persistently distributed 83 / 23.12% all / 33.33% eligible.
- Reported medians in `paper.md` and `findings.md` match the master JSON when rounded as displayed.
- Reported category-level flag counts match the master JSON: persistent top-identity changes 7, risk increases 3, risk decreases 4; historical bus-factor changes 10, risk decreases 10, top-identity changes 5; emerging bus-factor changes 12, risk increases 12, top-identity changes 5.
- `case-studies.md` correctly lists the top 10 historical-concentration scopes by `lifetime_touches` and the top 10 emerging-concentration scopes by `recent_touches`.
- `repository-summary.md` rows match repository-level counts and percentages computed from the master JSON, sorted descending by persistent-concentration percentage.

## Internal Contradictions

- No direct numerical contradictions were found across the four reviewed documents.
- `findings.md:83` says the category split surfaces cases where "historical concentration persists, weakens, or appears in the recent window." This is conceptually muddy because "Historical concentration" is also the name of the category where lifetime concentration weakens in the recent window. Suggested wording: "the category split surfaces cases where concentration persists, weakens, or emerges in the recent window."
- `paper.md:127` says "Most eligible concentrated scopes remain concentrated." This appears numerically true if "eligible concentrated scopes" means scopes concentrated in the lifetime window: 144 persistent out of 154 lifetime-concentrated eligible scopes. However, the denominator is not stated. Suggested wording: "Most eligible scopes that are lifetime-concentrated remain concentrated in the recent window."

## Unsupported Or Overstrong Claims

- `paper.md:9`, `paper.md:127`, and `paper.md:129` say the results "support" separate lifetime and recent reporting and that recency-aware reporting provides a "clearer account." This is reasonable as an interpretation, but it is stronger than a purely descriptive finding. Suggested wording: "The observed category differences motivate reporting lifetime and recent windows separately" and "provide a more explicit account under this protocol."
- `paper.md:42` states that the protocol was calibrated with Express and React before the full research set was reviewed. This is consistent with the protocol text, but the reviewed four documents and master JSON do not independently demonstrate that the calibration acceptance gate was completed. Suggested wording: "The protocol specifies calibration with Express and React before the full research set."
- `paper.md:81` says the case studies "illustrate how the comparison categories expose temporal differences." This is acceptable, but "expose" could be softened to "summarize" or "highlight" to avoid implying causal discovery.
- `paper.md:113` says the persistent-concentration pattern is "especially visible" in six named repositories. This is supported by high percentages in `repository-summary.md`, but it may read as qualitative emphasis. Suggested wording: "This pattern is numerically highest among the listed high-percentage repositories..."
- `paper.md:121` says a repository with many distributed scopes is not necessarily organizationally decentralized. This is a caution rather than a data claim and is appropriate, but it should remain in discussion/threats framing rather than being treated as a result.

## Grammar And Wording Improvements

- `findings.md:38-42` and `findings.md:51-55` are Markdown table rows without a header or separator. They render as loose pipe-delimited paragraphs rather than tables. Add headers or convert them to bullets.
- `findings.md:66` says "Historical concentration and emerging concentration each include 5 and 5 top identity changes respectively." Suggested wording: "Historical concentration and emerging concentration each include 5 top identity changes."
- `findings.md:28-29`, `findings.md:33-34`, and `findings.md:46-47` would read more cleanly with a blank line between paragraphs, or by combining the short follow-up sentence into the preceding paragraph.
- `paper.md:61` uses "At the other end of the sorted repository summary" and then includes Vue 2, which has zero eligible scopes and therefore a 0.00% value by convention rather than a meaningful eligible-scope percentage. Suggested wording: "Repositories with 0 persistent-concentration scopes include Golang, Kubernetes, Laravel, Rails, and Vue 2; Vue 2 has no eligible scopes because all 12 scopes have no recent activity."
- `paper.md:75` says "Other repositories are dominated by distributed or excluded categories." This is accurate for the examples that follow, but broad. Suggested wording: "Some repositories have summaries dominated by distributed or excluded categories."
- `paper.md:93` describes docker-compose `(root)` and React `scripts` as "Smaller" because they have fewer recent touches than preceding emerging cases. Suggested wording: "Lower-recent-touch emerging-concentration cases include..."
- `paper.md:119` says several categories "show higher top-identity-change rates" than persistent concentration. This is supported by the displayed rates, but the sentence could specify "higher than persistent concentration" for clarity.

## Suggested Priority Fixes

1. Fix the malformed case-study snippets in `findings.md` by adding table headers or converting them to bullet lists.
2. Clarify the denominator in `paper.md:127` for "Most eligible concentrated scopes remain concentrated."
3. Soften "support" / "clearer account" wording in `paper.md` where the conclusion is interpretive rather than directly measured.
4. Reword `findings.md:83` to avoid conflating "historical concentration" as a category name with concentration observed in historical data.
