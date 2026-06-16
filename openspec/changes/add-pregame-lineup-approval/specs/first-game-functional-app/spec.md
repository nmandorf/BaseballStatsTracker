## ADDED Requirements

### Requirement: Pregame Lineup Approval Flow
The app SHALL guide the user from game setup to lineup approval before live
stats entry starts.

#### Scenario: Generate lineup from game setup
- **WHEN** the user selects today's active players and opponent in Game Setup
- **THEN** the app generates a batting order from the selected players using
  season stats and approved slowpitch lineup priorities
- **AND** the generated order is available on the Batting Order screen

#### Scenario: Coach accepts lineup
- **WHEN** the coach reviews the generated batting order
- **THEN** the coach can move hitters before accepting the lineup
- **AND** starting the game initializes live stats entry with the accepted order
