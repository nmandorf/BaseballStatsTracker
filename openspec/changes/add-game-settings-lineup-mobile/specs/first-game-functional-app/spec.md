## ADDED Requirements

### Requirement: Pregame Game Settings
The app SHALL provide a Game Settings tab for editing game rules before live
stats entry starts.

#### Scenario: Edit game rules
- **WHEN** the analyst opens Game Settings
- **THEN** every supported game rule is editable from a mobile-first screen
- **AND** changes persist for Game Setup, Batting Order, and the started game

### Requirement: Mobile Lineup Review Priority
The Batting Order screen SHALL prioritize the suggested lineup on mobile.

#### Scenario: Open batting order on a phone viewport
- **WHEN** the coach opens Batting Order on mobile
- **THEN** Suggested Lineup appears before the page header, metric tiles, and
  ranking-priority controls
- **AND** the coach can accept the lineup and start live stats entry when the
  selected player pool is valid
