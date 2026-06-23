## ADDED Requirements

### Requirement: Schedule-Linked Game History

The app SHALL connect completed schedule entries to read-only statistics for that specific game.

#### Scenario: User opens a completed schedule entry

- **WHEN** the completed game is selected from schedule history
- **THEN** the app opens that game's final statistics view
- **AND** opponent, date, final score, plays, and player statistics come from the selected game ID
- **AND** statistics from another game are not mixed into the view

#### Scenario: User opens a cancelled game

- **WHEN** a cancelled game is selected from schedule history
- **THEN** the app shows its cancelled schedule details
- **AND** it does not offer a final-statistics link

#### Scenario: User opens a past bye

- **WHEN** a past bye row is selected from schedule history
- **THEN** the app shows it as a bye rather than a completed game
- **AND** it does not offer a final-statistics link

### Requirement: Completed Schedule Immutability

The app SHALL preserve completed-game schedule identity after statistics exist.

#### Scenario: User attempts to alter completed schedule metadata

- **WHEN** the user attempts to edit, reschedule, convert, or delete a completed game
- **THEN** the mutation is rejected
- **AND** its game-specific history and statistics remain unchanged
