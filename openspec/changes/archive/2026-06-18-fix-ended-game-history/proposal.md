## Why

Ending a game should reliably preserve the completed game in Game History, but the current flow does not make that history entry appear. The post-game stats view also mixes summary stats with the Game History box, which makes the after-game review screen heavier than it needs to be.

## What Changes

- Add completed-game persistence behavior so ending a game creates or updates a Game History entry for that game.
- Ensure the Game History view includes newly ended games with their final game context and summary.
- Keep the After Game Stats screen focused on post-game review by showing only the box score and player stats.
- Remove the Game History box from the After Game Stats screen.
- Preserve a mobile-first review flow after a game ends.

## Capabilities

### New Capabilities

- `completed-game-results`: Covers completed game history persistence and the focused after-game stats review experience.

### Modified Capabilities

- None.

## Impact

- Affected UI: game-ending flow, Game History display, and After Game Stats screen.
- Affected state/data behavior: completed game records must be persisted or promoted into the history collection/store when a game is ended.
- No new external dependencies are expected.
- No baseball scoring logic changes are introduced beyond ensuring already-computed final game stats are reflected in the correct places.
