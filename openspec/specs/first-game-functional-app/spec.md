# first-game-functional-app Specification

## Purpose
TBD - created by archiving change build-first-game-functional-app. Update Purpose after archive.
## Requirements
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

### Requirement: First-Game Data Model
The repository SHALL include Prisma models for the baseball tracker entities.

#### Scenario: Validate schema
- **WHEN** Prisma validates the schema
- **THEN** Team, Player, Game, GameLineup, AtBat, RunnerAdvancement,
  PlayerGameStats, and PlayerSeasonStats models are available

### Requirement: End Game Action
The app SHALL allow the analyst to end the current first game from Stats Entry.

#### Scenario: Analyst ends an in-progress game
- **WHEN** the analyst chooses End Game
- **THEN** the game state is persisted as final
- **AND** live bases are cleared
- **AND** the final score and player stats remain available

### Requirement: End-Of-Game Stats Summary
The app SHALL show post-game stats once the game is final.

#### Scenario: Game is final
- **WHEN** the user opens Stats Entry for a final game
- **THEN** the app shows final score, plays scored, team totals, and player
  offensive stats
- **AND** live scoring controls are not shown

### Requirement: Reset From Final Summary
The app SHALL let the analyst reset the local first-game demo after reviewing
final stats.

#### Scenario: Analyst starts over after final
- **WHEN** the analyst uses the reset action from the final summary
- **THEN** the seeded 10-player team returns to zero stats
- **AND** the game returns to in-progress first-inning state

### Requirement: Pregame Lineup Approval Flow
The app SHALL guide the user from game setup to lineup approval before live
stats entry starts.

#### Scenario: Generate lineup from game setup
- **WHEN** the user selects today's active players and opponent in Game Setup
- **THEN** the app generates a batting order from the selected players using
  season stats, approved slowpitch lineup priorities, and league gender rules
- **AND** the generated order is available on the Batting Order screen
- **AND** the first batting order slot is assigned to the highest-ranked active
  female player when at least one eligible female player is selected

#### Scenario: Coach accepts lineup
- **WHEN** the coach reviews the generated batting order
- **THEN** the coach can move hitters before accepting the lineup
- **AND** the app warns when the edited lineup does not place a female player
  first
- **AND** starting the game initializes live stats entry with the accepted order

### Requirement: Stitch-Aligned Stats Entry Layout
The Stats Entry screen SHALL present live scoring in the Stitch MCP mobile
layout order while keeping the analyst on the current batter screen.

#### Scenario: Live scoring screen order
- **WHEN** a game is active and the analyst opens Stats Entry
- **THEN** the screen shows, from top to bottom, the game situation header,
  batting order strip, current batter card, batter result buttons, compact
  occupied runners-on-base panel, conditional RBI controls, after-play summary,
  and sticky Undo / Save Play + Next Batter controls
- **AND** the layout uses the Stitch visual direction: warm off-white app
  background, field-green primary action, amber current batter highlight,
  restrained red out/destructive states, compact cards, and large tap targets

#### Scenario: Runners panel stays compact
- **WHEN** bases are occupied
- **THEN** only occupied base rows are shown with editable movement controls
  and pinch runner actions
- **AND** no separate runner advancement screen is introduced

#### Scenario: Bases are empty
- **WHEN** no bases are occupied
- **THEN** the runners panel shows "Bases empty"

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

### Requirement: First Game Prisma Sync
The frontend SHALL mirror first-game state changes to the Prisma backend while
keeping local scoring usable when the backend is unavailable.

#### Scenario: Save game state
- **WHEN** the analyst starts a game, saves a play, undoes a play, or ends a
  game
- **THEN** the app saves the updated local state
- **AND** posts the same snapshot to the Prisma first-game API

#### Scenario: Backend unavailable
- **WHEN** Prisma is not configured or the API request fails
- **THEN** the frontend keeps the local state and does not block live scoring

#### Scenario: Reset game
- **WHEN** the analyst resets the first game
- **THEN** local state is reset
- **AND** the frontend requests deletion of the persisted first-game snapshot

### Requirement: Finish Game Return Home
The app SHALL allow the analyst to finish reviewing a final first game and
return to the home page without clearing the saved final game state.

#### Scenario: Analyst finishes a final game from stats
- **GIVEN** the first game status is final
- **WHEN** the analyst chooses Finish Game from the final Stats Entry summary
- **THEN** the app keeps the finalized game state persisted
- **AND** the app navigates to `/`
- **AND** the reset-new-game action remains separate from the finish action

### Requirement: Female Leadoff League Rule
The app SHALL generate league-compliant lineup recommendations with a female
player batting first whenever the active player pool allows it.

#### Scenario: Active lineup includes female players
- **WHEN** the app generates a recommended batting order
- **THEN** lineup slot 1 is the active female player with the strongest
  stats-based lineup score
- **AND** every other player remains ranked by the approved slowpitch stats
  priorities unless spacing female players requires a local adjustment

#### Scenario: No active female player is available
- **WHEN** the selected active players do not include an eligible female player
- **THEN** the app shows a clear warning that the generated lineup cannot satisfy
  the league rule
- **AND** the app does not claim that the lineup is league-compliant

### Requirement: Female Player Distribution
The app SHALL distribute female players through the batting order according to
stats-based value while avoiding back-to-back female hitters when feasible.

#### Scenario: Multiple female players are active
- **WHEN** the app generates the lineup after placing the female leadoff hitter
- **THEN** remaining female players are placed as close as practical to their
  stats-based ranking
- **AND** the app avoids placing two female hitters back-to-back when there are
  enough male hitters to separate them

#### Scenario: Back-to-back female hitters are unavoidable
- **WHEN** the active player mix does not include enough male hitters to separate
  every female hitter
- **THEN** the app keeps the first slot female rule
- **AND** the app preserves the strongest available stats-based order while
  allowing the minimum necessary back-to-back female placements

### Requirement: Current Game Stat Scope
The app SHALL keep live first-game scoring stats separate from season stats.

#### Scenario: New game starts
- **WHEN** a new first-game state is created from a roster with season stats
- **THEN** each player's live game stats start at zero
- **AND** the player's season stats remain available on the player profile

#### Scenario: Play is saved during live scoring
- **WHEN** the analyst saves a play in Stats Entry
- **THEN** the live batter and runner stat displays update from current-game
  stats only
- **AND** the displayed current-game stats do not include prior season totals

### Requirement: Final Game Stat Scope
The app SHALL show only completed-game stats in the final first-game summary.

#### Scenario: Game is ended
- **WHEN** the analyst ends the current game
- **THEN** the final summary team totals and player rows are calculated from the
  completed game stats only
- **AND** season/all-time stats are not shown as final-game totals

### Requirement: Season Stat Scope
The app SHALL keep season stats available only on season-oriented surfaces.

#### Scenario: Season stats are shown outside live game review
- **WHEN** the user reviews season-oriented roster or lineup information
- **THEN** those surfaces may use player season stats
- **AND** the live and final game stat labels make the game-specific scope clear

### Requirement: Final Summary Alignment
The app SHALL align the final stats summary content cleanly on desktop and
mobile.

#### Scenario: Final summary layout renders
- **WHEN** the final-game stats summary is displayed
- **THEN** the side stat box aligns with the top of the main stats content on
  desktop
- **AND** the layout stacks without awkward spacing on mobile

### Requirement: Current-State Result Locking
The Stats Entry screen SHALL lock batter result options that are impossible for
the current base and out state before the analyst saves a play.

#### Scenario: Bases are empty
- **WHEN** there are no runners on base
- **THEN** Sac Fly, Fielder's Choice, and Double Play are locked
- **AND** hit, walk, reached-on-error, home run, and ordinary out results remain selectable

#### Scenario: Sac fly is possible only with a runner on third
- **WHEN** there is a runner on 3B and fewer than two outs
- **THEN** Sac Fly is selectable
- **AND** when 3B is empty or there are two outs, Sac Fly is locked

#### Scenario: Double play requires a runner and fewer than two outs
- **WHEN** at least one base is occupied and there are fewer than two outs
- **THEN** Double Play is selectable
- **AND** when bases are empty or there are two outs, Double Play is locked

#### Scenario: Fielder's choice requires a runner
- **WHEN** at least one base is occupied
- **THEN** Fielder's Choice is selectable
- **AND** when bases are empty, Fielder's Choice is locked

### Requirement: Account-Scoped First Game Sync
The app SHALL sync the active first-game snapshot through the signed-in
account's selected backend team.

#### Scenario: User saves game progress on one device
- **WHEN** a signed-in user saves first-game progress for the selected team
- **THEN** the backend stores the snapshot under that account team
- **AND** another device signed into the same account and team can load the
  latest snapshot

### Requirement: Pregame Game Settings
The app SHALL provide a Game Settings tab for editing game rules before live
stats entry starts.

#### Scenario: Edit game rules
- **WHEN** the analyst opens Game Settings
- **THEN** every supported game rule is editable from a mobile-first screen
- **AND** changes persist for Game Setup, Batting Order, and the started game

### Requirement: Mobile Lineup Review Priority
The Batting Order screen SHALL prioritize the suggested lineup on mobile.

#### Scenario: Open batting order on a phone viewport
- **WHEN** the coach opens Batting Order on mobile
- **THEN** Suggested Lineup appears before the page header, metric tiles, and
  ranking-priority controls
- **AND** the coach can accept the lineup and start live stats entry when the
  selected player pool is valid

