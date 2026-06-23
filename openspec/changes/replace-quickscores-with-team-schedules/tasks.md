## 1. Specification and architecture

- [x] 1.1 Approve the schedule, onboarding, start-lock, migration, and history requirements in this change.
- [x] 1.2 Choose and document the normalized per-game participant/lineup representation and its lifecycle invariants.
- [x] 1.3 Define discriminated internal schedule types, structured mutation errors, and pure schedule/start eligibility decisions.

## 2. Database and migration

- [x] 2.1 Add team timezone and schedule-completion state plus ordered game/bye schedule records.
- [x] 2.2 Make scheduled games own their selected players, generated/accepted order, rules, and starting defense without loose player-ID storage.
- [x] 2.3 Add indexes and constraints for team/season ordering, game linkage, account scoping, and immutable lifecycle reads.
- [x] 2.4 Add a backward-compatible schema migration that leaves all existing teams complete by default.
- [x] 2.5 Add a read-only preflight that resolves `noa01mandorf@gmail.com` to its Firebase owner UID and exact team IDs; stop with a useful report on zero or ambiguous matches.
- [x] 2.6 Add an idempotent, confirmed tester-data backfill that marks only those resolved teams incomplete, then verify its affected-row report.
- [ ] 2.7 Add Prisma/domain mapping tests and validate the schema migration and tester backfill against existing game data.

## 3. Schedule backend

- [x] 3.1 Add account-scoped schedule read and mutation helpers with validation for Game and Bye rows.
- [x] 3.2 Support add, count increase/decrease, edit, reschedule, cancel, and deletion of eligible future non-cancelled rows.
- [x] 3.3 Prevent mutation or deletion of completed games, prevent deletion of cancelled games, and preserve both lifecycle states for history.
- [x] 3.4 Add game-scoped preparation reads/writes and preserve lineup data across schedule metadata edits.
- [x] 3.5 Implement server-authoritative start with a five-minute threshold, online verification, and one-active-game transaction protection.

## 4. Required team onboarding

- [x] 4.1 Extend onboarding to team name -> initial roster -> required schedule.
- [x] 4.2 Let the user enter any positive schedule-week count and render that many mobile-friendly rows.
- [x] 4.3 Let each row switch between Game and Bye; offer only 7:00 PM, 8:00 PM, or 9:00 PM for games.
- [x] 4.4 Capture the device timezone and provide a dropdown of familiar standard timezone names; when detection is missing or invalid, require selection before saving.
- [x] 4.5 Route the tester account's incomplete existing teams through schedule completion without resetting roster or statistics.

## 5. Schedule management and home

- [x] 5.1 Add a mobile-first schedule management screen for upcoming rows and schedule history.
- [x] 5.2 Confirm destructive reductions and protect completed rows while changing schedule count.
- [x] 5.3 Replace the QuickScores home card with the next schedule row, next playable game after a bye, lineup status, and server-calibrated countdown.
- [x] 5.4 Show `Season schedule complete` with Manage Schedule when no upcoming row exists.
- [x] 5.5 Remove QuickScores fetch/API code, source links, footer copy, and obsolete tests.

## 6. Per-game setup and lineup

- [x] 6.1 Make Game Setup begin by selecting an upcoming scheduled game and remove manual opponent entry.
- [x] 6.2 Persist active players and league rules per selected game.
- [x] 6.3 Generate, edit, accept, and restore batting order and starting defense per game at any time before start.
- [x] 6.4 Preserve prepared lineup data when opponent, date, time, or side changes.

## 7. Start lock and Stats Entry

- [x] 7.1 Show a disabled Start Game action and accessible countdown before the five-minute threshold, then enable without a page refresh.
- [x] 7.2 Recheck eligibility on the server when starting and map stable error codes to useful UI messages.
- [x] 7.3 Block offline starts, early direct Stats Entry navigation, stale-client starts, cancelled/final games, and a second active game.
- [x] 7.4 Initialize live state only from the authorized scheduled game and preserve local-first scoring after successful start.

## 8. History

- [x] 8.1 Show completed, cancelled, and bye entries in schedule history with clear status labels.
- [x] 8.2 Link completed games to read-only game-specific plays and statistics.
- [x] 8.3 Omit statistics links for cancelled games and byes.
- [x] 8.4 Prevent completed games from being edited, rescheduled, or deleted in UI and backend.

## 9. Verification and compliance

- [ ] 9.1 Add focused tests for schedule validation, bye behavior, detected/manual/invalid timezone handling, DST conversion, lifecycle immutability, and schedule-count edits.
- [x] 9.2 Add boundary tests at more than five minutes early, exactly five minutes early, scheduled time, and late start.
- [ ] 9.3 Add tests for server-time failure, direct routes, stale clients, simultaneous starts, per-game state isolation, tester preflight zero/ambiguous matches, and scoped legacy-account backfill.
- [ ] 9.4 Run Yarn tests, lint, typecheck, build, Prisma validation, migration checks, OpenSpec validation, and inspect the focused diff.
- [ ] 9.5 Verify onboarding, schedule management, home countdown, per-game lineup, locked start, and history on mobile and desktop.
- [x] 9.6 Complete an independent review against `AGENTS.md`, engineering principles, approved OpenSpec artifacts, mobile-first direction, and Stats Entry constraints; resolve or document material findings.
