## ADDED Requirements

### Requirement: Current Game Stat Scope
The app SHALL keep live first-game scoring stats separate from season stats.

#### Scenario: New game starts
- **WHEN** a new first-game state is created from a roster with season stats
- **THEN** each player's live game stats start at zero
- **AND** the player's season stats remain available on the player profile

#### Scenario: Play is saved during live scoring
- **WHEN** the analyst saves a play in Stats Entry
- **THEN** the live batter and runner stat displays update from current-game
  stats only
- **AND** the displayed current-game stats do not include prior season totals

### Requirement: Final Game Stat Scope
The app SHALL show only completed-game stats in the final first-game summary.

#### Scenario: Game is ended
- **WHEN** the analyst ends the current game
- **THEN** the final summary team totals and player rows are calculated from the
  completed game stats only
- **AND** season/all-time stats are not shown as final-game totals

### Requirement: Season Stat Scope
The app SHALL keep season stats available only on season-oriented surfaces.

#### Scenario: Season stats are shown outside live game review
- **WHEN** the user reviews season-oriented roster or lineup information
- **THEN** those surfaces may use player season stats
- **AND** the live and final game stat labels make the game-specific scope clear

### Requirement: Final Summary Alignment
The app SHALL align the final stats summary content cleanly on desktop and
mobile.

#### Scenario: Final summary layout renders
- **WHEN** the final-game stats summary is displayed
- **THEN** the side stat box aligns with the top of the main stats content on
  desktop
- **AND** the layout stacks without awkward spacing on mobile
