## 1. Completed Game History Data Flow

- [x] 1.1 Identify the current active game persistence path and where completed-game history should be stored for local and backend-backed states.
- [x] 1.2 Add completed-game history load/save/upsert helpers keyed by stable game id.
- [x] 1.3 Update the end-game flow so ending a game saves the final active game state and upserts the completed-game history entry together.
- [x] 1.4 Ensure retrying the end-game save updates the existing history entry instead of creating duplicates.
- [x] 1.5 Ensure resetting or starting a new active scoring state does not clear completed-game history.

## 2. History And Final Stats Reads

- [x] 2.1 Update completed-game history selectors to read from the completed-game history store instead of only deriving from the current active game state.
- [x] 2.2 Update completed-game detail lookup so a Game History link opens the selected completed game's final stats.
- [x] 2.3 Keep season stats calculations season-scoped and final game stats calculations game-scoped after the data-flow change.

## 3. UI Updates

- [x] 3.1 Keep the Game History card or section on the season Stats page.
- [x] 3.2 Remove the Game History box from the after-game stats/final stats view.
- [x] 3.3 Adjust the final stats layout so the final box score and player game stats remain polished on mobile and desktop without the history card column.
- [x] 3.4 Preserve a clear navigation action from final stats back to the season Stats page.

## 4. Tests And Verification

- [x] 4.1 Add or update unit tests for completed-game history upsert behavior after ending a game.
- [x] 4.2 Add or update tests proving completed-game history survives active game reset or new active game setup.
- [x] 4.3 Add or update UI tests for the season Stats page showing the newly ended game in Game History.
- [x] 4.4 Add or update UI tests proving the after-game stats view shows box score and player stats without a Game History box.
- [x] 4.5 Run the project test suite with Yarn and fix any regressions introduced by this change.
