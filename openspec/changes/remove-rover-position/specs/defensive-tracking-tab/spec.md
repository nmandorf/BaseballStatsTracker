## MODIFIED Requirements

### Requirement: Defensive Position Support
The app SHALL support Pitcher, Catcher, First Base, Second Base, Shortstop, Third Base, Left Field, Left Center, Right Center, Right Field, and Bench state. Rover SHALL NOT be available as a defensive position.

#### Scenario: Coach configures a defensive alignment
- **WHEN** the coach opens the defensive alignment editor
- **THEN** the available fielding slots include P, C, 1B, 2B, SS, 3B, LF, LC, RC, and RF
- **AND** additional active players are assigned to Bench
- **AND** no Rover slot or Rover enablement control is shown

#### Scenario: App generates a defensive alignment
- **WHEN** the app generates a starting or later-inning defensive alignment
- **THEN** it assigns players only among the ten supported fielding positions and Bench

#### Scenario: App loads a legacy Rover assignment
- **WHEN** a saved game contains a player assigned to the removed Rover position
- **THEN** the app removes the unsupported slot and returns that player to Bench
- **AND** it removes defensive events tagged with the unsupported position

#### Scenario: Bench players are tracked
- **WHEN** an active player is not assigned to a fielding position for an inning
- **THEN** the player is listed as Bench for that inning
- **AND** the player does not receive defensive innings for a fielding position during that inning

#### Scenario: Vacant slot is tracked
- **WHEN** a required fielding position is explicitly marked `Vacant`
- **THEN** the alignment records the vacant position
- **AND** no player receives defensive innings or event credit for that position until a player is assigned
