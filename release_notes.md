After months of internal iteration, validation, and benchmarking on some of the largest open-source repositories in the ecosystem, Git Archaeologist is ready for public use.

### Why this exists
Static analysis tells you how complex a file is, but it doesn’t tell you if that complexity is actually causing problems. An impossibly dense 3,000-line file that hasn't changed in five years is not a risk; it's stable. A simple configuration file that causes production incidents every week is a massive risk. 

Git Archaeologist measures human engineering friction instead of static code syntax. By analyzing the frequency, acceleration, and concentration of commits, it helps engineering teams track structural abandonment, implicit coupling, and accumulating technical debt before it becomes an unmanageable crisis.

### Security First
We know that asking you to run an `npx` command on your proprietary company codebase requires an immense amount of trust. 
- **Git Archaeologist is a local, read-only wrapper around `git log`.**
- Your source code never leaves your machine. 
- It does not parse your AST. 
- It does not contain telemetry. 
- The CLI makes exactly zero network requests.

### What's new in 1.32.6

This release candidate focuses entirely on hardening the distribution, improving the CI workflow, and ensuring the documentation is backed by empirical evidence. 

- **GitHub Action Overhaul:** The PR interceptor has been rewritten as a composite action. It now automatically handles shallow clone detection and uses `gh pr comment` to generate clean, readable Markdown summaries of the structural risk introduced by a pull request.
- **Empirical Case Studies:** We ran the tool against mature, enterprise-scale repositories to prove its claims. You can now read the raw output and technical postmortems for [ESLint](https://github.com/SushantVerma7969/git-archaeologist/blob/main/docs/case-studies/eslint.md), [Express](https://github.com/SushantVerma7969/git-archaeologist/blob/main/docs/case-studies/express.md), and [OpenSauced](https://github.com/SushantVerma7969/git-archaeologist/blob/main/docs/case-studies/opensauced.md).
- **End-to-End Validation:** The NPM binary mappings have been fixed. Both `git-arch` and `git-archaeologist` resolve correctly in global installations, and the action has been verified in live throwaway repositories.
- **Documentation:** We rewrote the README to be completely transparent about what the tool can and cannot do, stripping out all speculative claims. We also added detailed breakdowns of the mathematics behind the Curse Score and Bus Factor calculations in `docs/how-it-works.md`.

### What's next
The engineering is structurally complete. Moving forward, the roadmap will be driven by real-world friction and feedback rather than internal feature development. We will be watching closely to see how the action performs on massive monorepos and refining the temporal decay heuristics based on actual user reports.
