# Recency Calibration

## Purpose

This workspace prepares calibration runs for the recency study protocol.
Calibration checks that lifetime and recent maintenance concentration can be
compared reproducibly before the protocol is applied to the broader research
set.

The calibration uses the fixed recent-period cutoff documented in
`research/recency-study-protocol.md`:

```text
2025-06-13T00:00:00Z
```

## Calibration Repositories

Express and React were chosen because the protocol already identifies them as
the two calibration cases.

- **Express** is the historical-concentration case. It should help confirm
  that lifetime concentration can weaken, disappear, or move to another leading
  identity in the recent window.
- **React** is the distributed-maintenance case. It should help confirm that a
  shorter recent window does not create apparent concentration solely because
  less evidence is available.

## Expected Outcomes

- Raw lifetime and recent JSON outputs are saved for each calibration
  repository.
- Lifetime and recent risk terminal outputs are saved for each calibration
  repository.
- Run metadata is recorded for each repository.
- Sparse recent activity is separated from distributed recent activity during
  manual review.
- Express and React produce meaningfully different comparison patterns.

## Acceptance Criteria

- The repository commit SHA matches the SHA recorded in `research/README.md`.
- The same checked-out repository commit is used for lifetime and recent runs.
- The git-archaeologist commit SHA, Node.js version, Git version, execution
  date, and cutoff date are recorded.
- Bot identities are absent from contributor rankings used for calibration.
- Top-share arithmetic is manually verified for one Express scope and one
  React scope.
- Bus factor is manually verified to reach the 50% touch threshold correctly.
- Raw outputs and metadata are retained under the repository-specific
  calibration directory.
