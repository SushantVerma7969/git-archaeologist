# Recency Study Category Analysis

Source: `research/recency-study/master-recency-study.json`

## Formulas

- Scope count: `count(rows where row.category == category)`
- Mean: `sum(non-null numeric field values) / count(non-null numeric field values)`
- Median: sort non-null numeric values; odd `n` uses the middle value; even `n` uses the average of the two middle values.
- Percentage of all scopes: `scope_count / total_scope_count * 100`
- Eligible scope denominator: count rows whose category is neither `No recent activity` nor `Insufficient recent evidence`.
- Percentage of eligible scopes: `scope_count / eligible_scope_denominator * 100` for eligible categories; `N/A` for excluded categories.

## Totals

- Total scopes: 359
- Eligible scopes: 249

## Category Statistics

| Category | Scopes | % All Scopes | % Eligible Scopes | Median Recent Touches | Mean Recent Touches | Median Lifetime Touches | Mean Lifetime Touches | Median Recent Identities | Median Lifetime Identities | Median Recent Concentration | Median Lifetime Concentration | Median Recent Bus Factor | Median Lifetime Bus Factor |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Persistent concentration | 144 | 40.11 | 57.83 | 206.5 | 1939.76 | 254 | 2430.86 | 6.5 | 7 | 0.7748 | 0.7815 | 1 | 1 |
| Historical concentration | 10 | 2.79 | 4.02 | 60.5 | 312.5 | 1354 | 1375.6 | 13.5 | 40.5 | 0.3649 | 0.6275 | 2 | 1 |
| Emerging concentration | 12 | 3.34 | 4.82 | 45 | 446.25 | 269 | 7024.75 | 8.5 | 29.5 | 0.631 | 0.3524 | 1 | 2 |
| Persistently distributed | 83 | 23.12 | 33.33 | 172 | 1624.63 | 827 | 13651.84 | 23 | 53 | 0.3333 | 0.3033 | 2 | 3 |
| No recent activity | 69 | 19.22 | N/A | 0 | 0 | 111 | 2046.72 | 0 | 10 | 0 | 0.6635 | 0 | 1 |
| Insufficient recent evidence | 41 | 11.42 | N/A | 4 | 4.2 | 13 | 238.85 | 1 | 4 | 1 | 0.7344 | 1 | 1 |
