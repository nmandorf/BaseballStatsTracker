## Context

The app currently supports roster setup, batting-order approval, live offensive stats entry, runner movement, score, outs, and game history. Defensive information is limited to generic player profile fields, so the app cannot explain who played each position, which defenders made routine plays, or where misplays created extra bases.

This change adds defensive tracking across UI, game state, local persistence, existing snapshot sync where available, Prisma-ready persistence, and player summaries. It must stay mobile-first and fast enough for amateur slowpitch scoring. `docs/engineering-principles.md` and `BestPracticesAGENT.md` require clear domain names, explicit state modeling, small reviewable boundaries, and testable decision logic.

## Goals / Non-Goals

**Goals:**

- Add Defense as a mode inside a locked live Game view.
- Add starting defensive setup after batting-order approval and before game start.
- Track half-inning responsibility from home/away side.
- Store defensive alignments by inning, position changes, bench state, and defensive innings by position.
- Capture MVP defensive events with quick required fields and optional detail.
- Add simple defensive ratings and notes to player profiles.
- Calculate defensive reliability stats and basic best-fit labels.
- Keep persistence local-first while including defensive state in the existing first-game snapshot sync where available and preparing Prisma models/migrations for durable structured storage.

**Non-Goals:**

- Do not build full opponent batting-order tracking, spray charts, heat maps, or MLB-style scorekeeping.
- Do not generate a full automatic defensive alignment in this change.
- Do not let defensive value reorder the batting lineup.
- Do not replace the existing offense-focused Stats Entry workflow.
- Do not add new third-party dependencies.

## Decisions

1. Use separate offense and defense routes behind one locked Game view.

   The Defense route owns field alignment, defensive events, and defensive half-inning controls. Stats Entry remains the fast offensive current-batter screen. Both routes share an in-game Offense/Defense control, while primary navigation remains limited to Home, Roster, Game Settings, and Stats. During an in-progress game, attempts to open non-game routes return to the route matching the current half-inning phase. A third out persists the phase transition and replaces the current route automatically.

   Alternative considered: combine offense and defense into one large component. That would increase component complexity and make the already-dense live batting screen harder to reason about.

2. Model game phase from home/away, inning, and half.

   The app should expose a pure helper that determines whether the team is batting or fielding from `isHome` and `half`. Home teams field in the Top half and hit in the Bottom half; away teams hit in the Top half and field in the Bottom half. Offensive saves and defensive saves both advance through the same inning/half transition helper. When an offensive half ends, bases clear, outs reset, the next batter index remains wherever the completed play advanced it, and the app moves to the defensive half. When a defensive half ends, defensive outs reset and the app moves to the next offensive half, incrementing the inning after Bottom halves.

   Alternative considered: use independent offense and defense counters. That risks contradictory inning state and harder undo behavior.

3. Store defensive alignment snapshots per defensive inning.

   Each defensive inning stores assigned players by position plus bench players. Required fielding slots should be filled by active players unless the coach explicitly marks a slot `Vacant` for a short-handed game; optional Rover can be disabled without counting as vacant. Position changes create a new alignment snapshot for the inning rather than mutating old innings. Defensive innings by position are derived from saved inning alignments, and vacant slots do not award defensive innings.

   Alternative considered: store only current alignment and aggregate counters. That would make game history, undo, and player-card breakdowns less trustworthy.

4. Keep defensive events intentionally coarse.

   The first build records event type, responsible fielder when applicable, position, outs recorded, runs allowed, optional ball type, optional impact/misplay detail, optional bases allowed, and notes. Routine outs, misplays, great plays, extra bases allowed, hit/no play, and double plays are enough to answer the MVP questions without forcing official scoring detail.

   Alternative considered: require assists, putouts, receiving fielders, base-by-base runner movement, and full opponent at-bats. That is useful later but too slow for the first live defensive workflow.

5. Separate defensive calculations from persistence and UI.

   Pure helpers should calculate defensive chances, routine success rate, misplay rate, great-play rate, extra bases allowed per inning, position innings, and best-fit labels from events, alignments, and ratings. UI and storage should call those helpers instead of embedding scoring rules in components or API handlers.

   Alternative considered: calculate summaries directly in the Defense screen. That would make edge cases difficult to test and would spread business rules across presentation code.

6. Add simple ratings as optional player profile data.

   Arm strength, throw accuracy, glove skill, range, and position confidence should use low/medium/high values. These help early-season best-fit labels before enough defensive events exist, but they are not required to save alignments or defensive events.

   Alternative considered: require ratings during game setup. That would slow the first game and create unnecessary setup friction.

7. Treat the live Game view as a protected, navigation-locked team stats area.

   The offense and Defense routes should use the same auth/team setup gate pattern as existing team-stat routes. While game status is `IN_PROGRESS`, the app shell hides primary navigation and redirects non-game routes back to the active game phase. Ending the game changes status to `FINAL` and restores normal navigation.

   Alternative considered: make Defense publicly accessible because it is a new route. That would conflict with the existing authenticated team-data model.

## Risks / Trade-offs

- Defensive event entry could slow live scoring -> Keep the first event form short, use alignment-based fielder defaults, and allow notes/detail to stay optional.
- Half-inning changes can regress offense flow -> Centralize inning transitions in pure helpers and cover home/away flows with unit tests.
- Saved local games will not have defense fields -> Normalize missing fields to empty alignments/events/ratings without invalidating existing games.
- Defensive stats may feel overconfident with small samples -> Display innings/chances near best-fit labels and treat ratings as supporting context.
- Prisma migrations add scope -> Keep database changes additive and nullable so rollback can ignore new defensive tables/fields without destructive data loss.
- Signed-in users could lose defense data if only local storage is updated -> Include defensive state in the existing first-game snapshot payload while structured Prisma tables are added.

## Migration Plan

1. Add defensive domain types, stat helpers, and game-state defaults with backward-compatible normalization.
2. Add Defense route/UI, starting-defense setup, and the locked in-game mode switch local-first with the existing auth/team setup gates.
3. Include defensive state in the existing first-game snapshot sync where available.
4. Add additive Prisma models for defensive alignments, defensive events, and player defensive ratings/notes.
5. Backfill is not required; existing games load with empty defensive tracking.
6. Rollback by hiding the Defense route and ignoring additive defensive records.

## Open Questions

- Which exact UI surface should show player defensive ratings: the existing roster edit modal, player cards, or a dedicated defense profile panel?
- Should a saved defensive event optionally include opponent batter context in a follow-up change without requiring an opponent lineup?
