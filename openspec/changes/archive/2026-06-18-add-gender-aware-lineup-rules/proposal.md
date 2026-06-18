# Add Gender-Aware Lineup Rules

## Why

The league requires a female player to bat first. The roster and lineup
recommendation flow currently do not capture player gender, so the app cannot
reliably generate a league-compliant batting order.

## What Changes

- Add a required Female/Male selection when adding or editing a player.
- Store player gender with the roster profile so game setup and lineup
  generation can use it.
- Update generated batting orders so the first slot is the best available
  female hitter by the approved stats-based lineup priorities.
- Distribute the remaining female players through the order according to their
  stats-based value while avoiding back-to-back female hitters when feasible.
- Show a clear lineup warning when the active players cannot satisfy the female
  leadoff rule.

## Non-Goals

- No changes to live scoring, runner movement, RBI logic, or game-state
  advancement.
- No automatic override of a coach-edited lineup beyond validation/warnings.

## Impact

- Affected specs: `team-onboarding-flow`, `first-game-functional-app`
- Affected code: player profile types and forms, local/backend team storage,
  Prisma player persistence, lineup recommendation rules, Batting Order and
  Game Setup validation messaging.
