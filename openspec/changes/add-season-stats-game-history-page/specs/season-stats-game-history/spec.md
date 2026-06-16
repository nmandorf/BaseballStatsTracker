## ADDED Requirements

### Requirement: Season Stats Tab
The app SHALL show season/all-time player stats when the user opens the Stats tab from the main navigation.

#### Scenario: User opens Stats from navigation
- **WHEN** the user clicks or taps the Stats tab in the app navigation
- **THEN** the app shows a season-scoped stats page
- **AND** player rows and summary values are calculated from season/all-time stats
- **AND** the page is labeled as "Season Stats"
- **AND** the page does not show the active or most recently completed game's player stats as if they were season totals

#### Scenario: Season stats page uses existing presentation pattern
- **WHEN** the season stats page renders
- **THEN** it reuses the existing stats table/card visual pattern where practical
- **AND** the data source is season/all-time player stats instead of current-game stats
- **AND** labels clearly distinguish season stats from game-specific stats

### Requirement: Final Game Stats Review
The app SHALL keep a game-specific final stats view for a completed game.

#### Scenario: User ends a game
- **WHEN** the user ends a game from the live scoring flow
- **THEN** the app shows the final game stats view for that completed game
- **AND** the final box score and player rows are calculated from that game only
- **AND** the view is labeled as "Final Game Stats"

#### Scenario: User opens completed game details
- **WHEN** the user opens a completed game from game history
- **THEN** the app shows the final stats view for the selected game
- **AND** player rows, team totals, score, and game summary are filtered to that selected game
- **AND** season/all-time totals are not displayed as the selected game's final stats

### Requirement: Completed Game History
The season Stats page SHALL include a game history area that lists completed games and links to each game's final stats view.

#### Scenario: Completed games exist
- **WHEN** the user opens the season Stats page after one or more games have been completed
- **THEN** the page shows a "Game History" card or section
- **AND** each completed game row includes enough context to identify the game, such as opponent, date or completion status, score, and result when available
- **AND** each completed game row provides a click or tap target that opens that game's final stats view

#### Scenario: No completed games exist
- **WHEN** the user opens the season Stats page before any game has been completed
- **THEN** the game history area shows an empty state
- **AND** the empty state does not replace or hide the season player stats

### Requirement: Matched Final Stats Layout
The app SHALL align the final game stats layout so related stat cards feel connected on desktop and stack cleanly on mobile.

#### Scenario: Final stats layout renders on desktop
- **WHEN** the final game stats view renders on a desktop-width viewport
- **THEN** the final box score card aligns with the top of the player game stats card
- **AND** the final box score card uses the same visual height as the player game stats card when they appear side by side
- **AND** a game history card shown in that layout uses the same visual height as the player game stats card
- **AND** column spacing is consistent between cards

#### Scenario: Final stats layout renders on mobile
- **WHEN** the final game stats view renders on a mobile-width viewport
- **THEN** the final box score, game history, and player game stats content stack in a readable order
- **AND** the layout avoids awkward vertical gaps or disconnected cards
- **AND** horizontal scrolling, if needed for dense stat tables, is contained within the table region

### Requirement: Explicit Stat Scope Data Flow
The app SHALL keep season and game stat data sources explicit at the page and component boundaries.

#### Scenario: Season stats are rendered
- **WHEN** a component renders the season Stats page
- **THEN** it receives or loads season/all-time stats through a season-scoped helper or prop
- **AND** it does not call a game-scoped stats helper for the player totals shown on that page

#### Scenario: Game stats are rendered
- **WHEN** a component renders a final game stats view
- **THEN** it receives or loads stats through a game-scoped helper or selected completed game identifier
- **AND** it does not call a season-scoped stats helper for the final game totals shown on that page
