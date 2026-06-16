## ADDED Requirements

### Requirement: Out Type Capture
The Stats Entry flow SHALL require an out type selection when the analyst records a normal `Out` result.

#### Scenario: Analyst selects normal out
- **WHEN** the analyst taps the `Out` result button
- **THEN** the app shows a quick popup titled `What kind of out?`
- **AND** the popup offers Groundout, Flyout, Lineout, Strikeout Looking, Strikeout Swinging, and Other Out

#### Scenario: Analyst chooses out type
- **WHEN** the analyst chooses an out type from the popup
- **THEN** the popup closes
- **AND** the current batter screen continues to runner movement, RBI, and after-play summary without navigating to a separate screen

#### Scenario: Analyst selects double play
- **WHEN** the analyst taps the `DP` result button
- **THEN** the app treats the play as a double play result
- **AND** the app does not require a normal out type selection

### Requirement: Out Type Persistence
The system SHALL store the main batter result and the selected out type for normal out plate appearances.

#### Scenario: Save normal out play
- **WHEN** the analyst saves a play with result `Out` and an out type selected
- **THEN** the saved plate appearance records result `OUT`
- **AND** the saved plate appearance records the selected out type as one of `GROUNDOUT`, `FLYOUT`, `LINEOUT`, `STRIKEOUT_LOOKING`, `STRIKEOUT_SWINGING`, or `OTHER_OUT`

#### Scenario: Save non-out play
- **WHEN** the analyst saves a play with result `1B`, `2B`, `3B`, `HR`, `BB`, `ROE`, `FC`, `SF`, or `DP`
- **THEN** the saved plate appearance records the main result
- **AND** the saved plate appearance does not require a normal out type

### Requirement: Basic Stats Preserve Existing Out Semantics
The system SHALL continue to count groundouts, flyouts, lineouts, strikeouts looking, strikeouts swinging, other outs, and double plays as outs for basic stat calculations.

#### Scenario: Calculate basic stats for out types
- **WHEN** a player has plate appearances ending in any normal out type
- **THEN** each normal out contributes to plate appearances, at-bats, and outs according to the existing `Out` result rules
- **AND** AVG, OBP, SLG, OPS, and Out Rate calculate consistently with those basic out totals

#### Scenario: Calculate basic stats for double play
- **WHEN** a player has a plate appearance ending in `DP`
- **THEN** the batter receives the double play result as an out for basic batter stats
- **AND** the play can still record multiple outs on the play for game state and runner movement

### Requirement: Contact And Out Quality Stats
The system SHALL calculate strikeout, ball-in-play, and productive-out metrics from saved plays and out types.

#### Scenario: Calculate strikeout stats
- **WHEN** a player's saved plays include strikeout looking and strikeout swinging out types
- **THEN** Strikeouts equals strikeout looking plus strikeout swinging
- **AND** Strikeout Rate equals Strikeouts divided by Plate Appearances
- **AND** Strikeout Looking Rate and Strikeout Swinging Rate are calculated separately over Plate Appearances

#### Scenario: Calculate ball in play stats
- **WHEN** a player's saved plays include hits, reached on error, fielder's choice, groundouts, flyouts, and lineouts
- **THEN** Balls In Play includes those outcomes
- **AND** Ball In Play Rate equals Balls In Play divided by Plate Appearances

#### Scenario: Calculate productive out stats
- **WHEN** a batter is out on a play and a runner advances, a runner scores, or the batter receives an RBI
- **THEN** the play counts as a productive out for that batter
- **AND** Productive Out Rate equals Productive Outs divided by Total Outs

### Requirement: Lineup Logic Uses Out Quality As Tiebreaker
The lineup recommendation system SHALL use out type metrics as small tiebreakers after reach-base, power, out avoidance, run production, speed, and analyst role hints.

#### Scenario: Similar players differ by strikeout rate
- **WHEN** two players have similar reach-base, power, and run-production profiles
- **AND** one player has a lower strikeout rate and higher ball-in-play rate
- **THEN** the lower-strikeout player is favored in contact-heavy lineup spots such as leadoff, second, and second leadoff

#### Scenario: Similar players differ by double play rate
- **WHEN** two players have similar power and run-production profiles
- **AND** one player hits into double plays more often
- **THEN** the higher double-play player receives a larger negative out-quality adjustment than a player with normal outs

#### Scenario: Lower lineup contact balancing
- **WHEN** the recommendation system arranges lower-lineup hitters
- **AND** multiple high-strikeout or high-out players are available
- **THEN** the app avoids stacking high-strikeout hitters together when a comparable contact hitter can separate them

#### Scenario: Hitting production remains primary
- **WHEN** a player reaches base and hits for power meaningfully more often than another player
- **THEN** the productive hitter remains ranked higher even if the other player makes less damaging outs
