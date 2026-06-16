## Why

The Stats navigation currently points at the live/final game stats flow, which makes it hard to distinguish season-long player performance from the completed-game box score. Users need the menu Stats tab to show season stats, while completed games remain reviewable from a game history list.

## What Changes

- Add a season-scoped Stats tab view that uses the existing stats presentation patterns but reads all-season player data.
- Keep the existing after-game stats screen as the game-specific final stats view shown immediately after ending a game.
- Add a game history area on the season Stats tab that lists completed games and links each game to its final game stats screen.
- Update the final game stats layout so the final box score card and game history card align visually with the player game stats card height where they appear together.
- Preserve the game-specific stat source for after-game views and the season/all-time stat source for the Stats tab.

## Capabilities

### New Capabilities

- `season-stats-game-history`: Covers season-scoped Stats tab behavior, completed-game history navigation, and game-specific final stats review layout requirements.

### Modified Capabilities

- None.

## Impact

- Affected routes and UI: Stats navigation target, season Stats page, final game stats page, shared stats display components, and responsive card layout.
- Affected data logic: selection of season stats versus game stats by page context, completed-game list data, and game-specific final stat lookup.
- No new external dependencies are expected.
