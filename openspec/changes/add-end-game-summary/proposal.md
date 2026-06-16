# Add End Game Summary

## Why

The first-game scoring flow can save plays and update player stats, but the
analyst has no way to close the game and review the final box-score style stats
after the last play.

## What Changes

- Add an end-game action to the Stats Entry workflow.
- Persist the game as final once ended.
- Replace live-entry controls with an end-of-game stats summary after final.
- Show team totals, final score, saved play count, and player offensive stats.
- Allow the analyst to reset the first-game state for a new review session.

## Non-Goals

- No multi-game season archive in this slice.
- No database writes or generated reports.
- No defensive stats.

## Impact

- Affected specs: `first-game-functional-app`
- Affected code: `src/lib/gameEngine.ts`, `src/sections/StatsEntrySection`,
  `src/types/game.ts`
