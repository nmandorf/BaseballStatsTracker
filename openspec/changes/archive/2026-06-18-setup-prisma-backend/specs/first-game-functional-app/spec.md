## ADDED Requirements

### Requirement: Prisma Backend Persistence Model
The backend SHALL represent the full durable baseball tracker data model in
Prisma.

#### Scenario: Store team and roster data
- **WHEN** the backend is initialized for the starter team
- **THEN** Prisma stores the team, season, roster players, contact notes,
  lineup roles, handedness, positions, speed ratings, and active flags

#### Scenario: Store game data
- **WHEN** a game is persisted
- **THEN** Prisma stores the game metadata, rules, lineup, current batter,
  base state, saved at-bats, runner advancements, score, outs, and inning

#### Scenario: Store stats and records
- **WHEN** game state is persisted
- **THEN** Prisma stores player game stats, player season stats, team game
  stats, team season stats, and team win/loss/tie records

### Requirement: Backend Snapshot Save Helper
The repository SHALL expose server-side helpers that map the local first-game
state into Prisma records.

#### Scenario: Persist first-game snapshot
- **WHEN** the snapshot helper receives the current first-game state
- **THEN** it upserts the starter team and season, replaces the game lineup,
  plays, runner movements, and game/player/team stat rows for that snapshot
- **AND** the helper runs the save in a Prisma transaction
