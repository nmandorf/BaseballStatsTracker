# team-onboarding-flow Specification

## Purpose
TBD - created by archiving change fix-team-onboarding-flow. Update Purpose after archive.
## Requirements
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
- **AND** the player includes name, gender, speed rating, active status, and
  optional bats, throws, primary position, experience/profile notes, contact
  notes, and suggested role hint
- **AND** gender is selected from Female or Male before the player can be used
  in a league-compliant generated lineup

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

### Requirement: Edit Existing Player Prior Stats

The app SHALL let the user edit prior offensive stats for a player after the team and player have been created.

#### Scenario: Open prior stats editor

- **WHEN** the user selects `Edit Prior Stats` for an existing roster player
- **THEN** the app opens a mobile-friendly modal populated with that player's saved baseline season stats
- **AND** stats from the currently tracked game are not included in the editable baseline

#### Scenario: Save prior stats

- **WHEN** the user changes prior games, batting outcomes, runs, or RBI and saves
- **THEN** the app derives Hits from singles, doubles, triples, and home runs
- **AND** the app derives At-Bats from hits, reached on error, fielder's choice, and outs
- **AND** the app derives Plate Appearances from at-bats, walks, and sacrifice flies
- **AND** the updated stats are saved to the existing player without changing player identity or other roster members
- **AND** the update is sent through the existing backend team persistence path when available

#### Scenario: Edit while a game exists

- **WHEN** prior stats are changed while an active or completed local game state references that player
- **THEN** the player's lineup baseline is updated
- **AND** saved plays, current-game stats, score, outs, and bases remain unchanged

#### Scenario: Cancel prior stats edit

- **WHEN** the user cancels the prior stats editor
- **THEN** the modal closes without changing the player's saved stats

