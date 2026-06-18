## ADDED Requirements

### Requirement: End Game Action
The app SHALL allow the analyst to end the current first game from Stats Entry.

#### Scenario: Analyst ends an in-progress game
- **WHEN** the analyst chooses End Game
- **THEN** the game state is persisted as final
- **AND** live bases are cleared
- **AND** the final score and player stats remain available

### Requirement: End-Of-Game Stats Summary
The app SHALL show post-game stats once the game is final.

#### Scenario: Game is final
- **WHEN** the user opens Stats Entry for a final game
- **THEN** the app shows final score, plays scored, team totals, and player
  offensive stats
- **AND** live scoring controls are not shown

### Requirement: Reset From Final Summary
The app SHALL let the analyst reset the local first-game demo after reviewing
final stats.

#### Scenario: Analyst starts over after final
- **WHEN** the analyst uses the reset action from the final summary
- **THEN** the seeded 10-player team returns to zero stats
- **AND** the game returns to in-progress first-inning state
