## MODIFIED Requirements

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

#### Scenario: Mobile live-entry layout follows Stitch flow
- **WHEN** the analyst opens Stats Entry for an in-progress game
- **THEN** the screen presents, in order, the game situation header, batting
  order strip, current batter card, batter result buttons, compact occupied
  runners-on-base panel, RBI controls when applicable, after-play summary, and
  sticky Undo / Save Play + Next Batter controls
- **AND** the analyst remains on the current batter screen while confirming
  runner movement

### Requirement: Runner Movement And RBI Defaults
The app SHALL auto-fill common runner movement and RBI credit while allowing
analyst edits before saving.

#### Scenario: Result selected with occupied bases
- **WHEN** the analyst selects 1B, 2B, 3B, HR, BB, ROE, FC, SF, Out, or DP
- **THEN** runner movement defaults match approved slowpitch rules
- **AND** occupied base rows can be edited before save

#### Scenario: Runners panel shows occupied bases only
- **WHEN** the play begins with runners on base
- **THEN** the runner movement panel shows one editable row for each occupied
  base
- **AND** each occupied base row includes pinch runner controls

#### Scenario: Bases are empty
- **WHEN** no bases are occupied before the play
- **THEN** the runner movement panel shows the text "Bases empty"

#### Scenario: Runs score
- **WHEN** at least one runner scores in the play preview
- **THEN** RBI controls are shown
- **AND** the default RBI value follows the approved result-based rules

#### Scenario: No runs score
- **WHEN** no runner scores in the play preview
- **THEN** RBI controls are hidden
