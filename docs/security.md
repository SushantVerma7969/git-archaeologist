# Security & Privacy

Git Archaeologist is explicitly designed to be safely executed on proprietary, enterprise-scale repositories. This document outlines the tool's threat model, data access, and network behavior.

## Core Guarantees
1. **Source code never leaves your machine.**
2. **Git Archaeologist does not read your source code (AST/File content).**
3. **The CLI makes zero network requests.**

---

## 1. Execution Profile
### What commands does it execute?
Git Archaeologist is a local Node.js wrapper around the native `git` binary. Under the hood, it executes read-only git log queries. 
The primary command executed is:
`git log --name-only -z --pretty=format:"..."`

### What data does it read?
The tool only reads Git metadata:
- Commit hashes
- Author Names and Author Emails
- Commit timestamps
- Commit message headers and bodies (solely for parsing `Co-authored-by` metadata and identifying conventional commit prefixes like `chore:` or `test:`)
- File paths that were modified

### What data does it NEVER read?
- It **never** reads the contents of your source code files.
- It **never** parses ASTs.
- It **never** reads passwords, API keys, or environment variables.

---

## 2. Network Behavior & Privacy
### CLI Network Behavior
When running `npx git-archaeologist` locally, the tool makes **zero network requests**. It does not send telemetry, it does not phone home for updates, and it does not transmit your repository statistics to any server.

### GitHub Action Network Behavior
When running via the official GitHub Action (`action.yml`), the execution environment requires a GitHub Token. The Action uses this token exclusively to communicate with the GitHub REST API/CLI (`gh pr view` and `gh pr comment`) to read the list of files modified in the PR and post the resulting Markdown summary back to the same Pull Request. No data is transmitted to external third-party servers.

---

## 3. Threat Model
### Malicious Code Injection
Because Git Archaeologist does not evaluate or parse the contents of your source code, it is immune to arbitrary code execution attacks embedded inside source files.

### Identity Extraction
The tool processes Author Names and Emails from the Git log. If you output the results to a public JSON artifact or HTML report, those developer identities will be visible in the output. The tool does not encrypt developer emails because they are inherent to the Git protocol. If you are operating under strict GDPR compliance regarding developer email visibility, do not publish the raw JSON `--json` output publicly.

### CI Supply Chain
To mitigate CI supply chain risks in highly secure environments, the composite GitHub Action executes standard shell commands (`gh` and `jq`) rather than relying on massive, opaque `node_modules` bundles. 

## Summary
If you trust the `git log` command on your terminal, you can trust Git Archaeologist.
