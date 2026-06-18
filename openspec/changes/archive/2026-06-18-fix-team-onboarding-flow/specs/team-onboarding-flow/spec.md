## ADDED Requirements

### Requirement: Empty First-Run Team State
The app SHALL start without a user-visible team when no user-created team exists.
Seeded or demo roster data MUST NOT appear as the default roster, game setup,
batting order, or stats entry team.

#### Scenario: No team exists
- **WHEN** the user opens the app without a saved user-created team
- **THEN** the app shows a team creation empty state
- **AND** roster, game setup, batting order, and stats entry do not show seeded
  players as the active team

#### Scenario: Legacy seed-only state exists
- **WHEN** saved local state contains only the previous seeded test team and no
  user-created team marker
- **THEN** the app treats setup as incomplete
- **AND** the user is prompted to create their own team before using team
  workflows

### Requirement: Team Creation Gate
The app SHALL require a team name before team-dependent workflows are available.

#### Scenario: Create team from empty state
- **WHEN** the user enters a valid team name and confirms team creation
- **THEN** the app saves the team as the active team
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
- **AND** the player includes name, speed rating, active status, and optional
  bats, throws, primary position, experience/profile notes, contact notes, and
  suggested role hint

#### Scenario: Finish initial roster setup
- **WHEN** the user has added at least one player and finishes onboarding
- **THEN** roster, game setup, batting order, and stats entry use the created
  team and players

### Requirement: Starting Player Stats
The app SHALL allow starting offensive stats to be entered for each created
player while defaulting every stat to zero.

#### Scenario: Player starts with no history
- **WHEN** the user creates a player without editing starting stats
- **THEN** plate appearances, at-bats, hits, singles, doubles, triples, home
  runs, walks, reached on error, fielder's choice, sac flies, outs, runs, and
  RBIs are saved as zero

#### Scenario: Player starts with prior history
- **WHEN** the user enters starting stat values for a player
- **THEN** those values are saved as the player's starting season stats
- **AND** roster cards and batting order recommendations can use those values

### Requirement: Add Players After Onboarding
The app SHALL provide a roster-management path for adding players to an existing
team after initial setup is complete.

#### Scenario: Add player to existing team
- **WHEN** the user opens roster management for an existing team and adds a
  player
- **THEN** the new player is saved to that team
- **AND** the player is available for future game setup and batting order flows

#### Scenario: Add player with starting stats later
- **WHEN** the user adds a player after onboarding and enters starting stats
- **THEN** the player is saved with those starting stats
- **AND** existing players and saved team identity are preserved

### Requirement: Team-Scoped Data
The app SHALL scope roster and player stats to the active user-created team.

#### Scenario: Team exists
- **WHEN** a user-created active team exists
- **THEN** roster, game setup, batting order, and stats entry read player data
  from that team
- **AND** team labels and counts reflect the user-created team rather than a test
  team

#### Scenario: Player is added
- **WHEN** a player is added to the active team
- **THEN** the player's profile and starting stats remain associated with that
  team across app reloads
