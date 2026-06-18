## MODIFIED Requirements

### Requirement: Initial Roster Setup
The app SHALL let the user create initial players for the new team during
onboarding.

#### Scenario: Add initial player
- **WHEN** the user adds a player during initial roster setup
- **THEN** the app stores the player on the active team
- **AND** the player includes name, gender, speed rating, active status, and
  optional bats, throws, primary position, experience/profile notes, contact
  notes, and suggested role hint
- **AND** gender is selected from Female or Male before the player can be used
  in a league-compliant generated lineup

### Requirement: Add Players After Onboarding
The app SHALL provide a roster-management path for adding players to an existing
team after initial setup is complete.

#### Scenario: Add player to existing team
- **WHEN** the user opens roster management for an existing team and adds a
  player
- **THEN** the new player is saved to that team with a Female or Male gender
  selection
- **AND** the player is available for future game setup and batting order flows

## ADDED Requirements

### Requirement: Player Gender Selection
The app SHALL require each roster player to have a Female or Male gender value
for league lineup validation.

#### Scenario: User creates or edits a player
- **WHEN** the user saves a player profile
- **THEN** the profile includes a selected gender value
- **AND** the value is persisted with the rest of the player profile

#### Scenario: Existing player has no gender
- **WHEN** a saved player profile does not have a gender value
- **THEN** roster and game setup identify the profile as needing gender
  selection
- **AND** generated lineup validation treats the player as ineligible for the
  female leadoff rule until gender is set
