# Recency Study Case-Study Scopes

Source: `research/recency-study/master-recency-study.json`

Selection rules:

- Historical concentration: top 10 scopes ranked by `lifetime_touches` descending.
- Emerging concentration: top 10 scopes ranked by `recent_touches` descending.

## Historical Concentration

| Repository | Scope | Category | Lifetime Touches | Recent Touches | Lifetime Concentration | Recent Concentration | Lifetime Bus Factor | Recent Bus Factor | Lifetime Top Name | Recent Top Name | Top Identity Changed |
|---|---|---|---:|---:|---:|---:|---:|---:|---|---|---|
| golang | test | Historical concentration | 3990 | 548 | 0.8458646616541353 | 0.2062043795620438 | 1 | 5 | Quim Muntal | khr@golang.org | true |
| vite | packages | Historical concentration | 2454 | 1399 | 0.6361043194784026 | 0.4874910650464618 | 1 | 2 | 翠 / green | 翠 | false |
| react | compiler | Historical concentration | 2089 | 452 | 0.5911919578745811 | 0.38495575221238937 | 1 | 2 | Joe Savona | Sebastian Markbåge | true |
| express | (root) | Historical concentration | 2042 | 26 | 0.8148873653281097 | 0.2692307692307692 | 1 | 2 | Douglas Christopher Wilson | Shivam Sharma | true |
| nestjs | integration | Historical concentration | 1996 | 77 | 0.6728456913827655 | 0.4025974025974026 | 1 | 2 | Kamil Mysliwiec | Kamil Mysliwiec | false |
| vite | docs | Historical concentration | 712 | 486 | 0.6067415730337079 | 0.4897119341563786 | 1 | 2 | 翠 / green | 翠 | false |
| redis | (root) | Historical concentration | 265 | 40 | 0.6188679245283019 | 0.225 | 1 | 3 | Salvatore Sanfilippo | Vitah Lin | true |
| docker-compose | internal | Historical concentration | 87 | 44 | 0.5632183908045977 | 0.38636363636363635 | 1 | 2 | Nicolas De Loof | Nicolas De Loof | false |
| vscode | .eslint-plugin-local | Historical concentration | 80 | 24 | 0.6625 | 0.20833333333333334 | 1 | 3 | Matt Bierner | Henning Dieterichs | true |
| svelte | .github | Historical concentration | 41 | 29 | 0.5121951219512195 | 0.3448275862068966 | 1 | 3 | Rich Harris | Rich Harris | false |

## Emerging Concentration

| Repository | Scope | Category | Lifetime Touches | Recent Touches | Lifetime Concentration | Recent Concentration | Lifetime Bus Factor | Recent Bus Factor | Lifetime Top Name | Recent Top Name | Top Identity Changed |
|---|---|---|---:|---:|---:|---:|---:|---:|---|---|---|
| kubernetes | vendor | Emerging concentration | 74803 | 3408 | 0.1317727898613692 | 0.5487089201877934 | 10 | 1 | Davanum Srinivas | Davanum Srinivas | false |
| vscode | test | Emerging concentration | 5201 | 1344 | 0.17554316477600462 | 0.671875 | 5 | 1 | Henning Dieterichs | Henning Dieterichs | false |
| rails | actioncable | Emerging concentration | 2230 | 203 | 0.13183856502242153 | 0.625615763546798 | 7 | 1 | Matthew Draper | Vladimir Dementyev | true |
| docker-compose | (root) | Emerging concentration | 300 | 113 | 0.45666666666666667 | 0.504424778761062 | 2 | 1 | Sebastiaan van Stijn | Sebastiaan van Stijn | false |
| react | scripts | Emerging concentration | 238 | 113 | 0.31092436974789917 | 0.584070796460177 | 2 | 1 | Sebastian "Sebbie" Silbermann | Sebastian "Sebbie" Silbermann | false |
| kubernetes | LICENSES | Emerging concentration | 569 | 50 | 0.3655536028119508 | 0.7 | 2 | 1 | Tim Hockin | Davanum Srinivas | true |
| react | .github | Emerging concentration | 66 | 40 | 0.4696969696969697 | 0.725 | 2 | 1 | Sebastian "Sebbie" Silbermann | Sebastian "Sebbie" Silbermann | false |
| laravel | config | Emerging concentration | 637 | 22 | 0.3626373626373626 | 0.6363636363636364 | 2 | 1 | Taylor Otwell | Taylor Otwell | true |
| nginx | .github | Emerging concentration | 28 | 22 | 0.39285714285714285 | 0.5 | 2 | 1 | Andrew Clayton | Andrew Clayton | false |
| golang | lib | Emerging concentration | 32 | 17 | 0.375 | 0.5882352941176471 | 2 | 1 | Quim Muntal | Filippo Valsorda | true |
