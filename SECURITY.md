# Security Policy

## Reporting a vulnerability

If you find a security issue in git-archaeologist, please report it privately
rather than opening a public issue.

Email the maintainer at **sushantverma07817@gmail.com** with:

- a description of the issue and its impact,
- steps to reproduce (a sample repository or path is ideal), and
- the version of git-archaeologist you tested.

You can expect an acknowledgement within a few days. Once a fix is available it
will be released as a patch version and noted in the CHANGELOG.

## Scope

git-archaeologist runs locally and reads a repository's git history. The areas
most relevant to security are:

- **Subprocess invocation** — git is always invoked with argument arrays, never
  a shell command string, so repository paths and flags cannot be interpreted as
  shell commands.
- **Generated HTML reports** — file and folder paths are escaped before being
  embedded in a report, so analyzing an untrusted repository and opening its
  report cannot execute injected markup.

If you believe either of these protections can be bypassed, that is in scope and
worth reporting.

## Supported versions

Only the latest published version on npm is supported. Please reproduce against
it before reporting.
