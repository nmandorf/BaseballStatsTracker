## 1. Specification and domain rules

- [x] 1.1 Define position-fit, locked-pitcher, female-minimum, and bench-fairness behavior.
- [x] 1.2 Add pure generation, normalization, bench-count, and alignment-validation helpers.
- [x] 1.3 Add focused tests for preference ranking, pitcher continuity, female minimum, fairness, deterministic output, and impossible rosters.

## 2. Game flow

- [x] 2.1 Persist and backward-normalize the locked pitcher in game state.
- [x] 2.2 Generate and save a fresh alignment when each new defensive inning begins.
- [x] 2.3 Prevent invalid starting or manually edited alignments from being saved.

## 3. Mobile UI

- [x] 3.1 Show locked pitcher and female-rule status in starting and live defense editors.
- [x] 3.2 Show bench sit counts and a concise fairness status without increasing live-entry complexity.
- [x] 3.3 Use controlled defensive-position inputs for profile preference fields.

## 4. Verification

- [x] 4.1 Run Yarn tests, lint, typecheck, OpenSpec validation, and diff checks.
- [ ] 4.2 Verify starting defense and a later inning at mobile width.
- [x] 4.3 Complete independent code, UI, and AGENTS/engineering-principles reviews.
