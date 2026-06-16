# Add Finish Game Home Return

## Why

After a game is ended, the analyst lands on the final Stats Entry summary but
has no clear completion action that returns them home. The flow should feel like
the game was saved and closed.

## What Changes

- Add a Finish Game action to the final Stats Entry summary.
- Keep the finalized first-game state persisted.
- Navigate the analyst back to the home page after finishing.
- Make the action feel distinct from resetting the game.

## Non-Goals

- No new season archive or historical games list.
- No changes to scoring or stat calculation logic.
- No database schema changes.

## Impact

- Affected specs: `first-game-functional-app`
- Affected code: `src/sections/StatsEntrySection`
