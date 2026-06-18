## 1. Routing And Data Boundaries

- [x] 1.1 Update the main navigation so the Stats tab opens the season-scoped stats page instead of the live/final scoring route.
- [x] 1.2 Add or identify a route for viewing a selected completed game's final stats without changing the live scoring entry route.
- [x] 1.3 Add clearly named helpers or selectors for season stats, completed-game history, and selected-game final stats.
- [x] 1.4 Ensure completed game lookup uses a stable game identifier or the existing first-game fallback when only one completed game is available.

## 2. Shared Stats Presentation

- [x] 2.1 Extract or adapt the existing stats table/card presentation so it can render either season stats or game stats from explicit props.
- [x] 2.2 Build the season Stats page using the existing stats visual pattern with "Season Stats" labels and season/all-time player data.
- [x] 2.3 Keep the final game stats view labeled "Final Game Stats" and backed by game-specific team/player totals only.
- [x] 2.4 Add a game history card or section to the season Stats page with completed game rows and links to final game stats.
- [x] 2.5 Add an empty state for game history that preserves the season player stats content.

## 3. Final Stats Layout

- [x] 3.1 Update the final game stats desktop grid so the final box score card aligns with the player game stats card.
- [x] 3.2 Make the final box score card and game history card match the player game stats card height when they appear together on desktop.
- [x] 3.3 Verify mobile stacking order and spacing for final box score, game history, and player game stats content.
- [x] 3.4 Keep dense player stat tables horizontally contained on mobile without creating disconnected spacing.

## 4. Verification

- [x] 4.1 Add or update tests for season Stats tab data scope versus final game data scope.
- [x] 4.2 Add or update tests for completed-game history linking to a game-specific final stats view.
- [x] 4.3 Add or update tests for no completed games showing a game history empty state.
- [x] 4.4 Run `yarn test`.
- [x] 4.5 Run `yarn typecheck`.
- [x] 4.6 Run `yarn lint`.
- [x] 4.7 Start the local dev server and visually verify desktop and mobile stats layouts when authentication/local state permits.
