# Case Study: OpenSauced

## Repository Overview
OpenSauced is an open-source intelligence platform that tracks GitHub metrics. It is a modern React/TypeScript application with a heavy emphasis on community contributions.

## Why this repository was selected
To evaluate how Git Archaeologist models the sociological boundaries of a community-driven repository, specifically separating core team maintainers from open-source contributors.

## Repository Statistics
- **Commits:** ~4,500
- **Age:** 3 years
- **Scale:** Mid-sized modern web application

## Exact Commands Executed
```bash
git-arch analyze .
git-arch ownership .
```

## Execution Time
`< 10 seconds`

## Key Findings

### 1. The Sociological Sandbox
**Command:** `git-arch analyze .`
**CLI Output:**
```
CURSE SCORE — top files by instability
  - components/contributor-highlight-card.tsx    authors: 32
  - pages/s/[org]/[repo]/index.tsx               authors: 5   changes: 97
```
**Observation:** The UI component `contributor-highlight-card.tsx` has been successfully modified by 32 different authors. In stark contrast, the core routing engine `pages/s/[org]/[repo]/index.tsx` has 97 historical changes, but is locked down to exactly 5 core authors.

### 2. Community Triage Automation
**Command:** `git-arch pr-risk .`
**Observation:** PRs touching the UI components can be mathematically classified as low-risk (safe for junior devs/community), while PRs touching the 5-author routing engine immediately require Staff-level oversight.

### 3. The Obvious Noise
**Command:** `git-arch blast components/signin.tsx .`
**Observation:** A 100% implicit coupling between `signin.tsx` and `signout.tsx`. This is mathematically true, but insultingly obvious to a human engineer.

## What Surprised Us
The ability of the tool to mathematically map the "Good First Issue" zone. Without relying on outdated `CODEOWNERS` files, the git history naturally revealed the exact sociological boundaries of the engineering team.

## Limitations
The `blast` command occasionally flags obvious architectural twins (like sign-in and sign-out logic) which adds noise to the output if an engineer queries those files directly.

## Engineering Takeaways
- Stop using outdated `CODEOWNERS` files to figure out who should review a PR.
- Use history to automate where to safely onboard new engineers.

## Why another engineer should care
Onboarding new engineers to a massive codebase is terrifying. You don't want them touching core architecture, but you want them to ship code. Git Archaeologist maps exactly where it is safe to play.

## Suggested Screenshots
- The Cursed Files table showing the Author Count disparity between routing and UI components.

## Suggested Terminal Snippet
```bash
npx git-archaeologist analyze .
```

## Suggested Social Media Excerpt
Where do you assign a junior dev on day one? In OpenSauced, core routing is locked down to 5 engineers, but a UI card has 32 different authors. `git-arch analyze` maps exactly where it is safe for newcomers to touch code.
