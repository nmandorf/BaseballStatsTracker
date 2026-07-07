## MODIFIED Requirements

### Requirement: Pregame Lineup Approval Flow
The app SHALL guide the user from game setup to offense and defense approval before live stats entry starts.

#### Scenario: Coach accepts offense and defense
- **WHEN** the coach reviews the generated batting order and starting defense
- **THEN** the batting order card provides Generate, Reset, and Accept actions
- **AND** the starting defense card provides Generate, Reset, and Accept actions
- **AND** each Accept action confirms the saved preparation with the backend before showing accepted status
- **AND** Start Game appears as a standalone action outside the offense and defense cards
- **AND** starting the game remains unavailable until the accepted batting order and accepted first-fielding-half defense are both valid
