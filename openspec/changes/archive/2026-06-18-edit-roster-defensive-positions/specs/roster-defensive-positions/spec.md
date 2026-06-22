## ADDED Requirements

### Requirement: Roster Displays Defensive Positions
The app SHALL show each player's saved primary defensive position in roster
management and SHALL clearly identify players without an assigned position.

#### Scenario: Player has a saved position
- **WHEN** the user opens the Roster tab for a player with a saved primary
  defensive position
- **THEN** the player's roster controls show that position as selected

#### Scenario: Player has no saved position
- **WHEN** the user opens the Roster tab for a player without a primary defensive
  position
- **THEN** the player's roster controls show the position as Unassigned

### Requirement: Roster Edits Defensive Positions
The app SHALL let the user select a supported slowpitch defensive position or
clear the assignment from each player's roster controls.

#### Scenario: Assign a defensive position
- **WHEN** the user selects a defensive position for a roster player
- **THEN** the app updates that player's primary defensive position
- **AND** the updated position remains visible on the roster card

#### Scenario: Clear a defensive position
- **WHEN** the user selects Unassigned for a roster player
- **THEN** the app clears that player's primary defensive position

#### Scenario: Preserve a legacy position value
- **WHEN** a player has a saved position outside the supported position list
- **THEN** the Roster tab continues to display the saved value
- **AND** the value is not changed until the user selects another option

### Requirement: Defensive Position Edits Persist
The app SHALL save roster position edits in the active-team mirror and SHALL
attempt to synchronize the updated team through the existing backend path.

#### Scenario: Position is changed
- **WHEN** the user changes a player's defensive position
- **THEN** the new position is saved to the local active team immediately
- **AND** the app attempts to persist the updated team through the backend

#### Scenario: Backend is unavailable
- **WHEN** a defensive position edit cannot synchronize to the backend
- **THEN** the locally saved position remains usable in roster management
