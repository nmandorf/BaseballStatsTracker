## MODIFIED Requirements

### Requirement: Pregame Lineup Approval Flow
The app SHALL guide the user from game setup to lineup approval before live
stats entry starts.

#### Scenario: Generate lineup from game setup
- **WHEN** the user selects today's active players and opponent in Game Setup
- **THEN** the app generates a batting order from the selected players using
  season stats, approved slowpitch lineup priorities, and league gender rules
- **AND** the generated order is available on the Batting Order screen
- **AND** the first batting order slot is assigned to the highest-ranked active
  female player when at least one eligible female player is selected

#### Scenario: Coach accepts lineup
- **WHEN** the coach reviews the generated batting order
- **THEN** the coach can move hitters before accepting the lineup
- **AND** the app warns when the edited lineup does not place a female player
  first
- **AND** starting the game initializes live stats entry with the accepted order

## ADDED Requirements

### Requirement: Female Leadoff League Rule
The app SHALL generate league-compliant lineup recommendations with a female
player batting first whenever the active player pool allows it.

#### Scenario: Active lineup includes female players
- **WHEN** the app generates a recommended batting order
- **THEN** lineup slot 1 is the active female player with the strongest
  stats-based lineup score
- **AND** every other player remains ranked by the approved slowpitch stats
  priorities unless spacing female players requires a local adjustment

#### Scenario: No active female player is available
- **WHEN** the selected active players do not include an eligible female player
- **THEN** the app shows a clear warning that the generated lineup cannot satisfy
  the league rule
- **AND** the app does not claim that the lineup is league-compliant

### Requirement: Female Player Distribution
The app SHALL distribute female players through the batting order according to
stats-based value while avoiding back-to-back female hitters when feasible.

#### Scenario: Multiple female players are active
- **WHEN** the app generates the lineup after placing the female leadoff hitter
- **THEN** remaining female players are placed as close as practical to their
  stats-based ranking
- **AND** the app avoids placing two female hitters back-to-back when there are
  enough male hitters to separate them

#### Scenario: Back-to-back female hitters are unavoidable
- **WHEN** the active player mix does not include enough male hitters to separate
  every female hitter
- **THEN** the app keeps the first slot female rule
- **AND** the app preserves the strongest available stats-based order while
  allowing the minimum necessary back-to-back female placements
