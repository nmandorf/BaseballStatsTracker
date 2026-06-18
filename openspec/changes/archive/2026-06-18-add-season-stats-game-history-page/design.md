## Context

The app currently uses the Stats Entry route for live scoring and the final game summary shown immediately after ending a game. The main navigation label is "Stats", so users expect the menu tab to show season/all-time stats, not the current completed-game box score. The app already separates game and season stat helpers in the scoring engine, so the main design challenge is routing and presentation: keep the game-specific final stats screen intact while adding a season-scoped stats page that reuses the same visual language.

The change must stay mobile-first, use the existing Next.js App Router and section/component structure, and avoid adding new baseball scoring logic beyond the approved stats-page scope.

## Goals / Non-Goals

**Goals:**

- Make the Stats navigation tab open a season stats page backed by season/all-time player stats.
- Keep the post-game final stats screen available after a game ends and from completed-game history.
- Add a game history card/list on the season Stats page where each completed game links to its final game stats screen.
- Reuse the existing final stats table/card presentation where practical, with data scope supplied by page context.
- Align the final box score card and game history card height with the player stats card in the relevant desktop layout, while keeping mobile stacking clean.

**Non-Goals:**

- Do not replace the season stat system or change stat formulas.
- Do not add new runner movement, RBI, lineup recommendation, or scoring rules.
- Do not add multi-team analytics, exports, charts, or advanced filtering.
- Do not introduce a new external UI or data dependency.

## Decisions

- Keep separate routes for season stats and game-specific final review.
  - The Stats navigation should route to the season stats page, while game-specific review should use a route or state keyed by the completed game. This avoids overloading one screen with hidden stat scope rules.
  - Alternative considered: keep `/stats-entry` as the menu target and conditionally show season stats when no game is active. That is harder to reason about and risks reintroducing season/game scope confusion.

- Reuse presentation components while passing explicit scoped data.
  - The same player stats table/card patterns can render either season or game stats, but props and labels should make the scope explicit: "Season Stats", "Final Game Stats", "Player Game Stats", and "Game History".
  - Alternative considered: build entirely separate UI. That would reduce accidental data mixing but adds duplication and makes future visual fixes more expensive.

- Treat completed-game history as navigation into game-scoped final stats.
  - The season Stats page should list completed games with score, opponent, date/status, and a link/action to view that game's final stats.
  - The final stats view should resolve stats from the selected completed game, not from the season aggregate.

- Use equal-height desktop layout through the grid container, not fixed pixel heights.
  - Cards that sit beside the player stats card should use consistent grid rows and stretch/alignment classes so they share height naturally on desktop.
  - Mobile should stack cards in a readable order without forcing equal heights.

## Risks / Trade-offs

- Game history may initially have only the current first-game persistence model → Build the UI against a small completed-games collection API/helper so the page can support one game now and more games later.
- Shared stats components can blur stat scope → Require explicit scope labels and scoped helper names at call sites.
- Equal-height cards can become cramped if the player stats table grows → Let the table scroll internally or allow the history/summary card content to use natural overflow rather than fixed clipped content.
- Linking to completed-game stats may need a stable game identifier → Prefer existing persisted game IDs where available and keep local fallback behavior for the first-game snapshot.
