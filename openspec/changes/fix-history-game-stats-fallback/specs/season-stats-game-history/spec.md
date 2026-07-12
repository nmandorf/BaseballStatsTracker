## MODIFIED Requirements

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

#### Scenario: Completed game snapshot is unavailable

- **WHEN** the user opens a completed scheduled game from game history
- **AND** the saved game snapshot is unavailable
- **AND** persisted game lineup and player game stats exist for that game
- **THEN** the app reconstructs the selected game's final stats view from the persisted game stats
- **AND** the player rows and box score remain scoped to that selected game

### Requirement: Completed Game History

The season Stats page SHALL include a game history area that lists completed games and links to each game's final stats view.

#### Scenario: Completed games exist

- **WHEN** the user opens the season Stats page after one or more games have been completed
- **THEN** the page shows a "Game History" card or section
- **AND** each completed game row includes enough context to identify the game, such as opponent, date or completion status, score, and result when available
- **AND** each completed game row shows a compact match breakdown with game-scoped offensive totals and rates when those stats are available
- **AND** each completed game row provides a click or tap target that opens that game's final stats view
