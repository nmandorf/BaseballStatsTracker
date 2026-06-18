## Context

The app has a live Stats Entry flow, a final game stats review screen, and a season Stats page with a Game History card. The current history behavior is fragile because completed-game history can be derived from the current game state instead of a durable completed-game record. That means ending a game may show final stats without reliably adding the game to Game History, especially after navigation, reset, or starting another game.

The final stats review screen also includes a Game History card. That makes the immediate after-game review compete with the season-level history workflow. The requested product behavior is clearer: after ending a game, review only the final box score and player game stats; use the Stats page's Game History area to browse completed games.

## Goals / Non-Goals

**Goals:**

- Persist or upsert a completed-game history entry when the analyst ends a game.
- Make the season Stats page's Game History area include the newly ended game without requiring another scoring action.
- Keep completed-game detail links working for final box score review.
- Remove the Game History box from the after-game stats/final stats review screen.
- Preserve mobile-first stats review with the final box score and player stats as the main content.

**Non-Goals:**

- Do not change batter result scoring, runner advancement, RBI, or lineup recommendation logic.
- Do not add multi-team history features beyond the active team's completed games.
- Do not introduce new external dependencies.
- Do not redesign the whole Stats tab or live Stats Entry workflow.

## Decisions

1. Treat completed-game history as its own persisted read model.
   - Ending a game should write the final game state into a completed-game history collection or equivalent store, keyed by a stable game id.
   - Alternative considered: keep deriving history from the current first-game state. That is simpler, but it loses the distinction between the active scoring state and completed games, and it can drop history when the active game is reset or replaced.

2. Use an upsert when ending a game.
   - If the same game is ended more than once, the final record should be updated rather than duplicated.
   - Alternative considered: always append a completed-game record. That risks duplicate Game History rows from repeated End clicks or retried saves.

3. Keep Game History on the season Stats page, not on the after-game stats view.
   - The final stats view should render the final box score and player game stats only. Navigation back to season stats remains available through the existing finish action.
   - Alternative considered: keep a compact history card on final stats. That contradicts the requested after-game focus and repeats navigation that already belongs on the Stats page.

4. Keep final game detail rendering game-scoped.
   - Opening a completed game from Game History should use the stored completed-game state or summary/detail record for that selected game.
   - Alternative considered: show the latest final state for every history link. That would make history links unstable as soon as more than one game exists.

## Risks / Trade-offs

- Completed-game records can diverge from the active game state if only one side is saved -> End-game save should write both the final active state and completed-game history record together at the UI/storage boundary.
- Local storage and Prisma-backed persistence may not support identical history APIs yet -> Implement a small helper layer that keeps local behavior working and lets backend sync follow the existing first-game persistence pattern.
- Existing tests may assert that final stats includes Game History -> Update tests to reflect the new product requirement that Game History appears on the season Stats page only.
- Resetting or starting a new game could accidentally delete completed history -> Reset behavior must clear the active game state without clearing completed-game history unless a future explicit history delete action exists.
