## 1. Stat rules

- [x] 1.1 Add a pure helper that derives Hits, At-Bats, and Plate Appearances from editable prior outcomes.
- [x] 1.2 Preserve detailed out classifications and reject totals lower than already classified outs.

## 2. Roster editing

- [x] 2.1 Add an `Edit Prior Stats` action for every existing roster player.
- [x] 2.2 Add a mobile-friendly modal populated from saved baseline stats, with clear derived fields, Cancel, and Save Stats actions.
- [x] 2.3 Persist edits locally and through the existing backend team sync.
- [x] 2.4 Synchronize the edited baseline into the active game lineup without changing game-only stats or plays.

## 3. Verification

- [x] 3.1 Add helper and UI structure tests for prior-stat editing.
- [x] 3.2 Run Yarn tests, typecheck, lint, and production build.
- [x] 3.3 Complete a separate project compliance review and resolve material findings.
