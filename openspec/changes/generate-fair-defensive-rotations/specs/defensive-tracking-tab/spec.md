## ADDED Requirements

### Requirement: Preference-Based Defensive Generation

The app SHALL generate defensive alignments from normalized player position preferences and defensive fit instead of batting-order position.

#### Scenario: Player has supported defensive preferences

- **WHEN** the app generates an alignment
- **THEN** best and primary positions receive priority over backup and neutral positions
- **AND** avoid positions are not used when a legal alternative exists
- **AND** relevant defensive ratings break preference ties deterministically

#### Scenario: Player has legacy position text

- **WHEN** a stored position uses a supported abbreviation or full position name
- **THEN** the app maps it to the matching defensive position
- **AND** unknown text is treated as no preference rather than causing generation to fail

### Requirement: Inning Defensive Rotation Generation

The app SHALL generate and save a distinct defensive alignment for every defensive inning.

#### Scenario: Team enters a new defensive inning

- **WHEN** an offensive half-inning ends and the team begins fielding
- **THEN** the app generates an alignment using the current lineup and all prior defensive alignments
- **AND** the new inning snapshot does not mutate prior inning alignments

### Requirement: Full-Game Pitcher Lock

The app SHALL keep the starting defensive pitcher at Pitcher for the full game.

#### Scenario: Later defense is generated

- **WHEN** the app generates any later defensive inning
- **THEN** the locked pitcher remains assigned to Pitcher
- **AND** the locked pitcher is not assigned to Bench

#### Scenario: Coach edits a later alignment

- **WHEN** a full-game pitcher is locked
- **THEN** the Pitcher control identifies the locked player and cannot move that player through a normal alignment edit

### Requirement: Minimum Female Defenders

The app SHALL require at least three female players to be assigned on defense in every inning.

#### Scenario: Alignment has enough female defenders

- **WHEN** three or more assigned defenders have gender `Female`
- **THEN** the alignment is eligible to save

#### Scenario: Alignment has fewer than three female defenders

- **WHEN** generation or a manual edit would assign fewer than three female defenders
- **THEN** the app reports a clear validation issue
- **AND** the invalid alignment cannot start or replace the game's saved defense

#### Scenario: Lineup cannot satisfy the rule

- **WHEN** fewer than three female players are available in the game lineup
- **THEN** the app explains that a compliant defense cannot be generated
- **AND** Unknown gender does not count toward the minimum

### Requirement: Fair Bench Rotation

The app SHALL minimize repeated bench innings while satisfying pitcher and gender constraints.

#### Scenario: Eligible players have not all sat

- **WHEN** a new inning requires bench players
- **THEN** a player who already sat is prioritized to field over a comparably eligible player who has not sat
- **AND** the generator avoids giving a player a second bench inning while another eligible player has not sat when constraints allow

#### Scenario: A repeat bench inning is unavoidable

- **WHEN** inning count or roster constraints require a player to sit again
- **THEN** the generator chooses from players with the lowest available bench count
- **AND** the UI displays bench counts without claiming every player can sit only once

### Requirement: Defensive Rotation Status

The app SHALL make automatic defensive constraints understandable in the existing mobile alignment UI.

#### Scenario: User reviews an alignment

- **WHEN** the starting or live defensive alignment is shown
- **THEN** the UI identifies the locked pitcher, assigned female-defender count, and current bench players
- **AND** touch controls remain at least 44 pixels high without horizontal overflow
