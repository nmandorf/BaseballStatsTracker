## ADDED Requirements

### Requirement: Game-Day Home Focus
The home page SHALL present a focused game-day surface instead of a product dashboard or feature explainer.

#### Scenario: User opens the home page
- **WHEN** a user visits `/`
- **THEN** the first viewport shows Kobe's Peeps game context
- **AND** the next game opponent, time, and field are prominent when available
- **AND** there is one dominant Start Game action
- **AND** secondary navigation actions are available for lineup review and roster editing
- **AND** the page avoids marketing-style feature explanation sections

### Requirement: QuickScores Schedule Source
The home page SHALL read the public QuickScores team schedule for game logistics.

#### Scenario: Schedule loads successfully
- **WHEN** the public QuickScores schedule can be fetched and parsed
- **THEN** the page shows the next playable Kobe's Peeps game after the current date
- **AND** the page includes a source/freshness label for QuickScores

#### Scenario: Schedule is unavailable or next listing is not playable
- **WHEN** the schedule cannot be fetched, cannot be parsed, or the next listing is a bye
- **THEN** the page shows a clear fallback state
- **AND** the Start Game navigation remains available

### Requirement: Home Scope Boundary
The home page SHALL remain navigation and schedule display only.

#### Scenario: User interacts with home actions
- **WHEN** the user selects Start Game, Review Lineup, or Edit Roster
- **THEN** the app navigates to the existing route
- **AND** no new scoring, runner movement, RBI, ranking, or database persistence behavior is introduced
