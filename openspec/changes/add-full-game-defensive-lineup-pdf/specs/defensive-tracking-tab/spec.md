## ADDED Requirements

### Requirement: Full-Game Defensive Lineup Grid

The app SHALL show a full-game defensive lineup grid on the Batting Order screen
before the game starts.

#### Scenario: Coach reviews a generated full-game defense

- **WHEN** a valid batting order has available players
- **THEN** the app shows players as rows in batting order from top to bottom
- **AND** the app shows seven defensive inning columns by default
- **AND** each cell shows the player's defensive position for that inning or `B`
  when the player is benched

### Requirement: Full-Game Defensive PDF

The app SHALL let the coach download the full-game defensive lineup as a
landscape letter PDF containing only the defensive grid.

#### Scenario: Coach downloads the defensive plan

- **WHEN** the coach selects the PDF download action
- **THEN** the downloaded PDF uses letter landscape page dimensions
- **AND** the PDF contains the batting-order rows and inning columns from the
  on-screen defensive grid
- **AND** bench cells are visually distinct and display only `B`

### Requirement: Protected Female Defender Rotation

The full-game defensive lineup planner SHALL avoid benching female players when
the lineup has three or fewer female players.

#### Scenario: Lineup has three or fewer female players

- **WHEN** the app generates the full-game defensive lineup
- **THEN** every available female player is assigned to a defensive position in
  every inning
- **AND** none of those female players appears as `B`

### Requirement: One-Bench Rotation Guardrail

The full-game defensive lineup planner SHALL avoid benching any player more than
once when that is possible for the roster size and inning count.

#### Scenario: Bench-once plan is possible

- **WHEN** total bench slots can be filled without repeating an eligible bench
  player
- **THEN** no player is assigned `B` more than once

#### Scenario: Bench-once plan is impossible

- **WHEN** total bench slots exceed eligible one-time bench players
- **THEN** the app still generates the fairest possible defensive grid
- **AND** the app warns that repeat bench innings are unavoidable
