# Fix History Game Stats Fallback

## Why

Completed scheduled games can appear in Game History from backend schedule data. If a completed game's JSON snapshot is unavailable, opening that history row can fail to show the same final game stats view used by other past games, even though per-player game stats are persisted.

## What Changes

- Load completed game details from persisted game stats when the saved snapshot is unavailable.
- Keep the existing Game History entry point and Final Game Stats presentation.
- Preserve season stats as the season-scoped view; selected game details remain game-scoped.

## Impact

- Affected specs: `season-stats-game-history`
- Affected code: `src/lib/scheduleBackend`, final game stats detail API
