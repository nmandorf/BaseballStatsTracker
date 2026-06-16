## MODIFIED Requirements

### Requirement: Add Players After Onboarding
The app SHALL provide a roster-management path for adding players to an existing
team after initial setup is complete.

#### Scenario: Add player to existing team
- **WHEN** the user opens roster management for an existing team and adds a
  player
- **THEN** the new player is saved to that team
- **AND** the app persists the player through the backend when the backend is available
- **AND** the player is available for future game setup and batting order flows

#### Scenario: Add player with starting stats later
- **WHEN** the user adds a player after onboarding and enters starting stats
- **THEN** the player is saved with those starting stats
- **AND** existing players and saved team identity are preserved

#### Scenario: Open add-player dialog from roster management
- **WHEN** the user chooses to add a player from roster management
- **THEN** the app opens the player form in a modal dialog above the roster page
- **AND** the roster page remains visible behind the dialog
- **AND** closing or canceling the dialog returns the user to roster management
  without adding a player
