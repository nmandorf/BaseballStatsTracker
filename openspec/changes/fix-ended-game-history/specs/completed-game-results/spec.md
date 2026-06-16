## ADDED Requirements

### Requirement: Ended Game Is Added To History
The app SHALL add the completed game to Game History when the analyst ends a game from the live Stats Entry flow.

#### Scenario: Analyst ends an in-progress game
- **WHEN** the analyst chooses End from an in-progress game
- **THEN** the app saves the game with final status and an ended-at timestamp
- **AND** the app creates or updates one completed-game history entry for that game
- **AND** the completed-game history entry includes opponent, final score, result, completion date or final status, play count, and a link to the game's final stats view

#### Scenario: Analyst returns to Stats after ending a game
- **WHEN** the analyst opens the season Stats page after ending a game
- **THEN** the Game History area lists the newly ended game
- **AND** selecting the newly ended game opens that game's final stats view

#### Scenario: End game save is retried
- **WHEN** the same game is ended or saved as final more than once
- **THEN** the app updates the existing completed-game history entry for that game
- **AND** the Game History area does not show duplicate rows for the same completed game

### Requirement: Completed History Survives Active Game Reset
The app SHALL keep completed-game history separate from the active scoring state.

#### Scenario: Analyst starts over after a final game
- **WHEN** a completed game has been added to Game History
- **AND** the analyst resets or starts a new active scoring state
- **THEN** the completed game remains available in Game History
- **AND** the reset or new active game does not remove the completed-game record

### Requirement: Focused After Game Stats View
The app SHALL show only the final box score and player game stats on the after-game stats view.

#### Scenario: Analyst reviews stats immediately after ending a game
- **WHEN** the app shows the after-game stats view for a completed game
- **THEN** the view shows the final box score
- **AND** the view shows player stats for that completed game
- **AND** the view does not show a Game History box, card, list, or section

#### Scenario: Analyst opens a completed game from history
- **WHEN** the analyst opens a completed game from Game History
- **THEN** the final stats view shows the selected game's box score and player game stats
- **AND** the final stats view does not show the Game History box

### Requirement: Season Stats Owns Game History
The app SHALL keep completed-game browsing on the season Stats page.

#### Scenario: Season Stats page renders
- **WHEN** the user opens the Stats page
- **THEN** the page shows season player stats
- **AND** the page shows the Game History area for completed-game browsing
- **AND** the Game History area does not replace or hide the season player stats
