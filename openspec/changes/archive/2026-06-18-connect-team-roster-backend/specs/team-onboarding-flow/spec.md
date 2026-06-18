## MODIFIED Requirements

### Requirement: Team Creation Gate
The app SHALL require a team name before team-dependent workflows are available.

#### Scenario: Create team from empty state
- **WHEN** the user enters a valid team name and confirms team creation
- **THEN** the app saves the team as the active team
- **AND** the app persists the team through the backend when the backend is available
- **AND** the app advances to initial roster setup for that team

#### Scenario: Open team-dependent route before setup
- **WHEN** the user opens roster, game setup, batting order, or stats entry before
  creating a team
- **THEN** the route presents the team setup gate instead of team-dependent
  controls

### Requirement: Initial Roster Setup
The app SHALL let the user create initial players for the new team during
onboarding.

#### Scenario: Add initial player
- **WHEN** the user adds a player during initial roster setup
- **THEN** the app stores the player on the active team
- **AND** the app persists the player through the backend when the backend is available
- **AND** the player includes name, speed rating, active status, and optional
  bats, throws, primary position, experience/profile notes, contact notes, and
  suggested role hint

#### Scenario: Finish initial roster setup
- **WHEN** the user has added at least one player and finishes onboarding
- **THEN** roster, game setup, batting order, and stats entry use the created
  team and players

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

### Requirement: Team-Scoped Data
The app SHALL scope roster and player stats to the active user-created team.

#### Scenario: Team exists in backend
- **WHEN** a backend-persisted active team exists
- **THEN** the app can load that team and its players into the active-team mirror
- **AND** team labels and counts reflect the backend team rather than a test team

#### Scenario: Backend unavailable during team changes
- **WHEN** the user creates a team or adds a player and the backend request fails
- **THEN** the local active-team mirror remains usable
- **AND** the user can continue the mobile-first setup flow without losing the entered data
