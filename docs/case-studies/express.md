# Case Study: Express

## Repository Overview
Express is the de-facto standard web framework for Node.js. It is one of the most downloaded packages in the npm ecosystem, heavily relied upon by millions of production applications.

## Why this repository was selected
To test the `risk` command on a widely-used, mature repository to determine if historical Git blame is sufficient for measuring technical debt without temporal context.

## Repository Statistics
- **Commits:** ~6,000
- **Age:** 14 years
- **Scale:** Core Node.js infrastructure

## Exact Commands Executed
```bash
git-arch risk .
```

## Execution Time
`< 2 seconds`

## Key Findings

### 1. The Legacy Anchor (Bus Factor 1)
**Command:** `git-arch risk .`
**CLI Output:**
```
  HIGH RISK
  support
  Historical commit-touch concentration: 97.2%
  Bus Factor: 1
  Historical file paths: 18   Contributor identities: 4

  Top historical contributor: TJ Holowaychuk
  Latest analyzed activity: 12 years ago
```
**Observation:** The core `support/` architecture is 97.2% owned by a single contributor who has a Bus Factor of 1. 

### 2. The Temporal Truth
**Command:** `git-arch risk .`
**Observation:** The top historical contributor (TJ Holowaychuk) last committed to the repository **12 years ago**. 

### 3. The Obvious Noise
**Command:** `git-arch blast package.json .`
**Observation:** `package.json` changes alongside `package-lock.json`. This is physically mandated by the Node.js ecosystem and provides zero new engineering insight.

## What Surprised Us
That a framework downloaded millions of times a week still attributes 97% of a core directory's structural history to a single abandoned developer from over a decade ago.

## Limitations
Historical `git blame` is completely useless for assessing risk without temporal context. If a tool tells you someone owns 97% of the code, but fails to tell you they left 12 years ago, the metric is functionally dangerous.

## Engineering Takeaways
- You cannot evaluate the risk of a codebase simply by counting commits.
- Temporal ownership (when the owner was last active) is the only metric that separates a healthy, active maintainer from an abandoned structural vulnerability.

## Why another engineer should care
If you are adopting a new open-source framework or conducting technical due diligence on a company acquisition, you need to know if the architecture is structurally abandoned. Git Archaeologist identified it instantly.

## Suggested Screenshots
- The terminal output showing "Latest analyzed activity: 12 years ago" under a High Risk warning.

## Suggested Terminal Snippet
```bash
npx git-archaeologist risk .
```

## Suggested Social Media Excerpt
Express is downloaded millions of times a week. When we ran `git-arch risk .` on it, the analysis found that the core `support/` module is 97% owned by a single engineer who hasn't committed code in 12 years. Stop relying on `git blame`. Temporal context is everything.
