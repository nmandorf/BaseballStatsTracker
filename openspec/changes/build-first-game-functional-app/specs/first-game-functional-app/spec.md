## ADDED Requirements

### Requirement: First-Game Seed Team
The app SHALL provide a seeded 10-player team for the first game of a new
season.

#### Scenario: Season starts with test team
- **WHEN** the user opens roster, game setup, batting order, or stats entry
- **THEN** the app shows the same 10-player team
- **AND** every tracked player stat starts at zero

### Requirement: Deterministic Lineup Recommendation
The app SHALL recommend a batting order using simple amateur slowpitch stats and
profile signals.

#### Scenario: Recommend from zero-stat players
- **WHEN** all player stats are zero
- **THEN** the recommendation uses role, speed, contact notes, and seed order as
  deterministic tie-breakers

#### Scenario: Recommend from updated stats
- **WHEN** players accumulate saved play stats
- **THEN** the recommendation prioritizes OBP, low out rate, SLG, OPS, XBH%,
  batting average, runs, RBIs, contact notes, and speed

### Requirement: Live Stats Entry Engine
The app SHALL maintain a live game state for the current batter screen.

#### Scenario: Save a play
- **WHEN** the analyst selects a batter result, confirms runner movement, and
  saves the play
- **THEN** the app updates score, outs, bases, batter stats, runner stats, RBI,
  saved play history, and current batter
- **AND** the next batter loops to the first hitter after the last hitter

#### Scenario: Undo a saved play
- **WHEN** the analyst taps undo after saving a play
- **THEN** the previous game state, base state, score, outs, batter index, and
  player stats are restored

### Requirement: Runner Movement And RBI Defaults
The app SHALL auto-fill common runner movement and RBI credit while allowing
analyst edits before saving.

#### Scenario: Result selected with occupied bases
- **WHEN** the analyst selects 1B, 2B, 3B, HR, BB, ROE, FC, SF, Out, or DP
- **THEN** runner movement defaults match approved slowpitch rules
- **AND** occupied base rows can be edited before save

#### Scenario: Runs score
- **WHEN** at least one runner scores in the play preview
- **THEN** RBI controls are shown
- **AND** the default RBI value follows the approved result-based rules

### Requirement: First-Game Data Model
The repository SHALL include Prisma models for the baseball tracker entities.

#### Scenario: Validate schema
- **WHEN** Prisma validates the schema
- **THEN** Team, Player, Game, GameLineup, AtBat, RunnerAdvancement,
  PlayerGameStats, and PlayerSeasonStats models are available
