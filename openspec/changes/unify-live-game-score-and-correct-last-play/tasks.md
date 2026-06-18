## 1. Shared live-game header

- [x] 1.1 Add a shared score card with inning/half, current phase, outs, and both scores.
- [x] 1.2 Use the same top-level gutter and vertical rhythm for Offense and Defense.
- [x] 1.3 Replace the separate offense header and defense stat-tile scoreboard.

## 2. Last-play correction

- [x] 2.1 Record the inning half on new scored plays and normalize older saved plays safely.
- [x] 2.2 Add pure engine helpers that identify and replace only the latest play in the active offensive half.
- [x] 2.3 Rebuild the replacement from its pre-play snapshot and preserve unrelated defensive alignment state.
- [x] 2.4 Add explicit Stats Entry edit/cancel UI and prevent lineup chips from silently changing the live batter.

## 3. Verification

- [x] 3.1 Test Out to HR and HR to Out replacements, derived totals, undo, and eligibility boundaries.
- [x] 3.2 Run Yarn tests, lint, typecheck, and production build.
- [ ] 3.3 Verify mobile and desktop Offense/Defense header alignment.
- [x] 3.4 Complete a separate AGENTS/engineering/OpenSpec/mobile product compliance review.
