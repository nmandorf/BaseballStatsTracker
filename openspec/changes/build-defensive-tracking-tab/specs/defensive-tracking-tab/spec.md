## ADDED Requirements

### Requirement: In-Game Offense And Defense Modes
The app SHALL provide mobile-first Offense and Defense modes inside the locked live Game view without adding either mode to primary navigation.

#### Scenario: User switches game mode
- **WHEN** the user selects Offense or Defense inside the live Game view
- **THEN** the app shows the current defensive alignment and defensive event controls
- **AND** the Stats Entry screen remains focused on the current offensive batter workflow

#### Scenario: Team is not currently fielding
- **WHEN** the user opens the Defense tab during an offensive half-inning
- **THEN** the app shows the next defensive alignment context and a clear indication that the team is currently batting

#### Scenario: Third out changes mode
- **WHEN** a saved offensive or defensive event records the third out
- **THEN** the game advances to the next half-inning
- **AND** the Game view automatically opens the mode for the team's new batting or fielding phase

### Requirement: Live Game Navigation Lock
The app SHALL keep an in-progress game isolated from the primary application navigation until the user ends the game.

#### Scenario: Game starts
- **WHEN** the coach starts the game after approving the batting order and starting defense
- **THEN** the app opens the live Game view
- **AND** primary navigation is unavailable while the game status is `IN_PROGRESS`

#### Scenario: User attempts to leave a live game
- **WHEN** the user attempts to navigate to a non-game route while the game status is `IN_PROGRESS`
- **THEN** the app returns the user to the live Game view for the current half-inning phase

#### Scenario: Game ends
- **WHEN** the user ends the game
- **THEN** the game status becomes `FINAL`
- **AND** primary navigation becomes available again

### Requirement: Primary Navigation Scope
The app SHALL show only Home, Roster, Game Settings, and Stats in primary navigation outside a live game.

#### Scenario: User views primary navigation
- **WHEN** no game is in progress
- **THEN** the main navigation contains Home, Roster, Game Settings, and Stats
- **AND** Batting Order and Defense are available only through the game setup and live game flows

### Requirement: Starting Defensive Setup
The app SHALL require the coach to set or confirm a starting defensive alignment after batting-order approval and before starting live game play.

#### Scenario: Coach accepts batting order
- **WHEN** the coach accepts the batting order
- **THEN** the app offers a starting defense setup step before live scoring starts
- **AND** the coach can assign active players to field positions or Bench

#### Scenario: Coach starts game after setting defense
- **WHEN** every required defensive slot has a valid player or an explicit `Vacant` state for a short-handed game
- **THEN** the coach can start the game
- **AND** the first defensive alignment is saved with inning and half-inning context

#### Scenario: Optional Rover is disabled
- **WHEN** the coach disables the optional Rover slot
- **THEN** the game can start without a Rover assignment
- **AND** the disabled Rover slot does not count as a vacant required position

### Requirement: Defensive Position Support
The app SHALL support standard slowpitch defensive positions plus an optional Rover and Bench state.

#### Scenario: Assign defensive positions
- **WHEN** the coach edits an alignment
- **THEN** the available slots include Pitcher, Catcher, First Base, Second Base, Shortstop, Third Base, Left Field, Left Center, Right Center, Right Field, optional Rover, and Bench
- **AND** a player can occupy no more than one fielding position in the same alignment

#### Scenario: Bench players are tracked
- **WHEN** an active player is not assigned to a fielding position for an inning
- **THEN** the player is listed as Bench for that inning
- **AND** the player does not receive defensive innings for a fielding position during that inning

#### Scenario: Vacant slot is tracked
- **WHEN** a required fielding position is explicitly marked `Vacant`
- **THEN** the alignment records the vacant position
- **AND** no player receives defensive innings or event credit for that position until a player is assigned

### Requirement: Half-Inning Phase Tracking
The app SHALL derive whether the team is batting or fielding from game home/away side and inning half.

#### Scenario: Home team half-inning phase
- **WHEN** the team is home
- **THEN** the team is fielding in the Top half
- **AND** the team is batting in the Bottom half

#### Scenario: Away team half-inning phase
- **WHEN** the team is away
- **THEN** the team is batting in the Top half
- **AND** the team is fielding in the Bottom half

#### Scenario: Defensive half-inning ends
- **WHEN** saved defensive events bring the defensive outs to three
- **THEN** the game advances to the next offensive half-inning
- **AND** defensive outs reset to zero

#### Scenario: Offensive half-inning ends
- **WHEN** saved offensive plays bring the offensive outs to three
- **THEN** the game advances to the next defensive half-inning
- **AND** offensive outs reset to zero
- **AND** offensive bases clear
- **AND** the next batter remains the batter after the completed offensive play

#### Scenario: Bottom half-inning ends
- **WHEN** either team phase records the third out in the Bottom half
- **THEN** the game advances to the Top half of the next inning
- **AND** half-inning outs reset to zero

### Requirement: Inning Defensive Alignments
The app SHALL save defensive alignments by inning and allow position changes during defensive innings.

#### Scenario: Keep same defense
- **WHEN** a defensive half-inning starts
- **THEN** the analyst can keep the previous defensive alignment for the new inning
- **AND** the alignment is saved for that inning

#### Scenario: Change defensive alignment
- **WHEN** the analyst swaps players, moves a player, marks a player sitting, or adds a substitute
- **THEN** the app saves the updated alignment for the current defensive inning
- **AND** prior inning alignments remain unchanged

### Requirement: Defensive Event Entry
The app SHALL record quick defensive events without requiring official scorekeeping detail.

#### Scenario: Fielder selection infers position
- **WHEN** the analyst selects the fielder who made the play
- **THEN** the event position defaults to that player's position in the current defensive alignment
- **AND** the analyst can still change the suggested position

#### Scenario: Position selection infers fielder
- **WHEN** the analyst selects a defensive position with an assigned player
- **THEN** the event fielder defaults to the player assigned to that position
- **AND** the analyst can still change the suggested fielder

#### Scenario: Ball type infers defensive area
- **WHEN** the analyst selects a ball type before manually choosing a defender
- **THEN** fly and outfield-oriented balls default to an assigned outfield position and fielder
- **AND** ground, pop-up, and infield-oriented balls default to an assigned infield position and fielder
- **AND** the analyst can override the suggestion

#### Scenario: Record routine out
- **WHEN** the analyst records a routine out made
- **THEN** the app requires the fielder, position, and outs recorded
- **AND** the event can include optional ball type and notes

#### Scenario: Record misplay
- **WHEN** the analyst records a misplay
- **THEN** the app requires the responsible fielder, position, misplay type, and play result
- **AND** the event can track whether the batter reached, a runner advanced, a run scored, an extra base was allowed, or an out was missed

#### Scenario: Record great play
- **WHEN** the analyst records a great play
- **THEN** the app requires the fielder, position, and impact
- **AND** supported impacts include saved an out, saved a run, prevented extra base, ended inning, and double play started

#### Scenario: Record extra bases allowed
- **WHEN** the analyst records extra bases allowed
- **THEN** the app records the responsible fielder when clear, position, bases allowed, and whether a run scored

#### Scenario: Record hit or no play
- **WHEN** the analyst records hit/no play
- **THEN** the app can save the event without assigning blame to a defender
- **AND** the event can record opponent runs allowed and optional notes

#### Scenario: Record double play
- **WHEN** the analyst records a double play turned
- **THEN** the app records two defensive outs
- **AND** the event can capture involved players, involved positions, optional ball type, and optional notes

### Requirement: Opponent Score And Defensive Outs
The app SHALL let defensive event saves update opponent score and defensive outs for the live game.

#### Scenario: Defensive event allows runs
- **WHEN** the analyst saves a defensive event with opponent runs allowed
- **THEN** the opponent score increases by that run count

#### Scenario: Defensive event records outs
- **WHEN** the analyst saves a defensive event with one or more outs
- **THEN** the current half-inning outs increase by that count up to three
- **AND** the half-inning advances when the third out is recorded

#### Scenario: Undo defensive event
- **WHEN** the analyst undoes the last saved defensive event
- **THEN** the previous game state, opponent score, outs, half-inning, alignment, and defensive event history are restored

### Requirement: Defensive Persistence
The app SHALL preserve defensive tracking in local game state and include it in existing game snapshot sync when sync is available.

#### Scenario: Existing saved game has no defensive fields
- **WHEN** an older saved game is loaded
- **THEN** the app initializes defensive alignments, events, ratings, and summaries to empty defaults
- **AND** existing offensive game state remains usable

#### Scenario: Synced game snapshot includes defense
- **WHEN** the app syncs a live game snapshot
- **THEN** defensive alignments, defensive events, ratings references, and defensive notes are included with the snapshot payload where the existing snapshot path is available

### Requirement: Defensive Ratings And Notes
The app SHALL allow simple optional defensive ratings and notes on player profiles.

#### Scenario: Edit defensive ratings
- **WHEN** the user edits a player profile
- **THEN** the user can set arm strength, throw accuracy, glove skill, range, and position confidence
- **AND** each rating supports Low, Medium, and High values

#### Scenario: Edit defensive notes
- **WHEN** the user edits defensive notes
- **THEN** the app saves notes for defensive strengths, weaknesses, best position, avoid position, backup position, communication, injury, or comfort context

### Requirement: Defensive Calculated Stats
The app SHALL calculate simple defensive stats from saved alignments and defensive events.

#### Scenario: Calculate defensive chances
- **WHEN** defensive stats are calculated for a player
- **THEN** defensive chances equal routine plays made plus great plays plus misplays

#### Scenario: Calculate defensive rates
- **WHEN** a player has defensive chances
- **THEN** routine play success rate equals routine plays made divided by defensive chances
- **AND** misplay rate equals misplays divided by defensive chances
- **AND** great play rate equals great plays divided by defensive chances

#### Scenario: Calculate extra bases allowed per inning
- **WHEN** a player has defensive innings
- **THEN** extra bases allowed per inning equals extra bases allowed divided by defensive innings played

#### Scenario: Calculate defensive innings by position
- **WHEN** saved alignments include a player at multiple positions
- **THEN** the player summary shows defensive innings grouped by position

### Requirement: Defensive Player Summary
The app SHALL show a defensive summary for each player based on ratings, notes, alignments, and events.

#### Scenario: View player defensive summary
- **WHEN** the user views a player card
- **THEN** the card shows defensive innings, routine plays made, great plays, misplays, extra bases allowed, defensive notes, and a basic best-fit label

#### Scenario: Best-fit label uses limited evidence
- **WHEN** the app displays a best-fit defensive label
- **THEN** it includes enough context to show whether the label is based on ratings, defensive innings, defensive events, or a small sample
