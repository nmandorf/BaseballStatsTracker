## MODIFIED Requirements

### Requirement: Team Creation Gate

The app SHALL require a team name, at least one initial roster player, and a valid team-managed schedule before new-team setup is complete.

#### Scenario: Create team from empty state

- **WHEN** the user enters a valid team name and confirms team creation
- **THEN** the app saves the team in an incomplete setup state
- **AND** the app persists the team through the backend when the backend is available
- **AND** the app advances to initial roster setup for that team

#### Scenario: Complete initial roster setup

- **WHEN** the user has added at least one player
- **THEN** the app advances to required schedule setup
- **AND** the team is not marked setup-complete yet

#### Scenario: Complete initial schedule setup

- **WHEN** the user saves one or more valid schedule rows including at least one Game row
- **THEN** the team is marked setup-complete
- **AND** roster, game setup, batting order, and stats workflows become available

#### Scenario: Initial schedule contains only byes

- **WHEN** every configured schedule row is a Bye
- **THEN** team setup remains incomplete
- **AND** the app asks the user to configure at least one playable game

#### Scenario: Open team-dependent route before setup

- **WHEN** the user opens a team-dependent route before all required setup steps are complete
- **THEN** the route presents the incomplete step instead of team-dependent controls

### Requirement: Team-Scoped Data

The app SHALL scope roster, schedule, game preparation, and player stats to the active user-created team.

#### Scenario: Team exists in backend

- **WHEN** a backend-persisted active team exists
- **THEN** the app can load that team, its players, and its schedule into the active-team experience
- **AND** team labels and counts reflect the backend team rather than test data

#### Scenario: Backend unavailable during team or roster changes

- **WHEN** the user creates a team or adds a player and the backend request fails
- **THEN** the local active-team mirror preserves the entered team and roster data
- **AND** schedule completion and game start remain unavailable until the schedule can be persisted and server-verified

## ADDED Requirements

### Requirement: Existing-Team Schedule Compatibility

The app SHALL introduce required schedule onboarding without forcing unrelated existing accounts through setup again.

#### Scenario: Existing team belongs to another account

- **WHEN** the migration processes a team not owned by `noa01mandorf@gmail.com`
- **THEN** the team remains setup-complete
- **AND** its roster, games, and statistics remain unchanged

#### Scenario: Existing team belongs to the tester account

- **WHEN** a read-only preflight resolves `noa01mandorf@gmail.com` to a confirmed Firebase owner UID and expected team IDs
- **AND** the scoped tester backfill processes those confirmed teams
- **THEN** the team is marked as needing schedule completion
- **AND** its roster, existing games, and statistics are preserved
- **AND** the next team-dependent workflow directs the tester to the schedule-format step

#### Scenario: Tester account cannot be resolved safely

- **WHEN** the preflight finds no expected team or produces an ambiguous account match
- **THEN** the tester backfill stops without changing team setup state
- **AND** it reports why the account could not be targeted safely
