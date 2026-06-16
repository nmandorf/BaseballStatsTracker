<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Engineering Standards

- Treat `docs/engineering-principles.md` as required project guidance for all code changes.
- Optimize for readable, boring, reviewable code that reduces surprise for the next developer.
- Prefer early returns, business-meaning names, clear internal boundaries, honest state modeling, separated decision logic, useful structured errors, focused diffs, and tests for risky behavior.
- Before considering any implementation complete, check the change against the checklist in `docs/engineering-principles.md`.

# Sub-Agent Compliance Review

- For every prompt that builds, changes, or meaningfully refactors the app, run a separate sub-agent/code-compliance review before finalizing the work when sub-agents are available.
- The compliance reviewer should check the changed code against this `AGENTS.md`, `docs/engineering-principles.md`, relevant OpenSpec artifacts, mobile-first UI direction, and the Stats Entry product constraints.
- Treat the sub-agent as a reviewer, not the product implementer, unless the user explicitly asks for delegated implementation.
- Resolve or explicitly call out any material compliance findings before marking the work complete.

# Project Workflow

- Use Yarn for dependency and script commands in this project.
- OpenSpec is initialized for Codex and Cursor. Create and apply OpenSpec changes before building product features.
- Keep the app mobile-first. Do not add baseball tracker feature logic until the relevant OpenSpec change is approved.

# Stats Entry UI Direction

- Keep live stats entry fast and mobile-first: tap result -> confirm runners -> add pinch runner if needed -> confirm RBI if needed -> save play -> next batter.
- The Stats Entry screen should stay on the current batter screen instead of using a bulky separate runner advancement screen.
- Organize Stats Entry as: game situation header, batting order strip, current batter card, batter result buttons, compact runners-on-base panel, RBI controls only when someone scored, after-play summary, then Undo / Save Play + Next Batter.
- Batter result buttons: 1B, 2B, 3B, HR, BB, ROE, FC, SF, Out, DP.
- After a result is selected, auto-fill the most likely runner movement, but let the analyst edit before saving.
- The Runners On Base panel should show only occupied bases. If bases are empty, show "Bases empty".
- Runner movement controls should default to dropdowns. Runner on 1B options: Stays at 1B, To 2B, To 3B, Scores, Out. Runner on 2B options: Stays at 2B, To 3B, Scores, Out. Runner on 3B options: Stays at 3B, Scores, Out.
- Each occupied base row should include "Use Pinch Runner". Selecting a pinch runner should open a bottom sheet or modal, then show the replacement runner plus "Pinch running for [original runner]" with Change and Remove Pinch Runner controls.
- The original batter keeps the batting result. The pinch runner gets credit for baserunning outcomes.
- Show RBI controls only if someone scored. Default RBI logic: hits yes, home runs yes, sac fly yes, bases-loaded walk yes, reached on error no, fielder's choice ask, double play no.
- Before saving, show an after-play summary of scored runners, base movement, runs, outs, and RBI.
- Save Play + Next Batter should save batter result, runner movement, pinch runner event, score, outs, bases, batter stats, runner stats, RBI, then advance to the next batter and loop to the first batter after the last hitter.
- Treat this section as UI/product direction only until the matching OpenSpec change approves implementation.

# Baseball / Slowpitch Softball Stats App Instructions

Treat this section as product and analysis direction for how the app should work, especially how batting orders are created every game. Keep the OpenSpec workflow above: create and apply the relevant OpenSpec change before building product features or baseball tracker feature logic.

## Project Goal

Build a simple, fast, mobile-friendly slowpitch softball stats app that helps an amateur team:

1. Create and manage a full roster
2. Select active players for each game
3. Track simple offensive stats during games
4. Track runner movement after each batter
5. Calculate player performance from simple stats
6. Suggest the best batting order based on available amateur-level data

The app should feel like a clean sports tool, not a spreadsheet. It should be easy enough to use during a live game.

## Core App Concept

The app is built around a player card workflow.

The analyst creates a permanent roster. Before each game, they select which players are active. During the game, the analyst enters each batter's result and confirms runner movement. After games, the app updates each player card with stats and helps recommend future batting orders.

Main flow:

1. Build Roster
2. Select Game Lineup
3. Review Suggested Batting Order
4. Enter Stats Player-by-Player
5. Track Runner Movement
6. Review Updated Player Cards

## Main Navigation

Use 4 main sections:

- Roster
- Game Setup
- Batting Order
- Stats Entry

Suggested mobile navigation:

- Roster
- Game
- Order
- Stats

Suggested desktop navigation:

- Team Dashboard
- Roster
- Game Setup
- Batting Order
- Stats Entry

## Recommended Tech Setup

Use Next.js for the app.

Recommended structure:

- Pages should live in a `pages` folder.
- Reusable components should live in a `Components` folder.
- Each component should only do one thing.
- Each component should have one component file.
- Component file should be named `index.tsx`.
- Each component should have its own CSS file inside the same component folder.
- CSS files should use the format `ComponentName.css`.
- Larger page sections should live in a `Sections` folder.
- Sections include layout pieces such as Header, Footer, Stats Entry Layout, Roster Section, Batting Order Section, etc.

Example structure:

```text
/pages
  /roster
  /game-setup
  /batting-order
  /stats-entry

/Components
  /PlayerCard
    index.tsx
    PlayerCard.css
  /ResultButton
    index.tsx
    ResultButton.css
  /BaseDiamond
    index.tsx
    BaseDiamond.css

/Sections
  /Header
  /Footer
  /RosterSection
  /StatsEntrySection
  /BattingOrderSection
```

## Data Storage Recommendation

Use a SQL database with Prisma.

This app has structured relational data, so SQL is a good fit.

Main data types:

- Team
- Player
- Game
- GameLineup
- AtBat
- RunnerAdvancement
- PlayerGameStats
- PlayerSeasonStats

Prisma is recommended because it works well with TypeScript, Next.js, and structured relational data.

## Roster Screen

The Roster screen is where the analyst adds every player on the team. The roster is the permanent player list. Each player should have a player card.

Player card fields:

- Name
- Bats: Right / Left / Switch / Unknown
- Throws: optional
- Primary position: optional
- Speed: Fast / Average / Slow
- Notes
- Active / inactive status
- Games played
- Basic offensive stats
- Suggested lineup role

The player card should show the player's strengths in simple language, such as:

- High OBP table-setter
- Power hitter
- Contact hitter
- Bottom-order hitter
- Second leadoff type
- Inconsistent but has power
- Good runner
- Slow runner

## Game Setup Screen

Before each game, the analyst selects who is active.

Game setup should include:

- Opponent name
- Date
- Active players
- Batting lineup size: 9, 10, 11, or everyone
- Home / away
- Optional notes
- League rules for the game

League rule settings:

- Home run limit: Yes / No
- Home run limit number
- What happens after home run limit: Out / Single / Other
- Run limit per inning
- Mercy rule
- Courtesy runners allowed
- Walks allowed
- Sac flies tracked
- Errors tracked
- Fielder's choices tracked

## Batting Order Logic

For amateur slowpitch softball, the lineup should be based on simple offensive value.

The main rule:

Put the people who get on base the most at the top, put the best gap/power hitters behind them, and hide the weakest/out-prone hitters lower in the order.

Because this is amateur slowpitch, do not rely on advanced baseball stats like:

- Bat speed
- Exit velocity
- Barrel rate
- Sprint speed
- Stealing stats
- Pitch-type performance

Instead, use simple tracked stats.

## Stats Needed Per Player

Minimum useful fields:

- Player name
- Plate appearances
- At-bats
- Hits
- Singles
- Doubles
- Triples
- Home runs
- Walks
- Reached on error
- Fielder's choice
- Sac flies
- Outs
- Runs
- RBIs
- Speed: Fast / Average / Slow
- Notes

Useful contact notes:

- Hits line drives
- Pops up too much
- Hits hard ground balls
- Hits weak grounders
- Pulls everything
- Can hit opposite field
- Can place the ball
- Usually hits gaps
- Slow runner
- Fast runner
- Gets thrown out on bases
- Good with runners on

## Calculated Stats

The app should calculate:

- Batting Average: AVG = Hits / At-bats
- On-Base Percentage: OBP = Times reached base / Plate appearances
- Slugging Percentage: SLG = Total bases / At-bats
- OPS: OPS = OBP + SLG
- Extra-Base Hit Percentage: XBH% = Doubles + Triples + Home Runs / Hits
- Out Rate: Out% = Outs / Plate appearances

Times reached base can include:

- Hits
- Walks
- Reached on error, if tracked

Total bases:

- Single = 1
- Double = 2
- Triple = 3
- Home run = 4

Out rate is very important in slowpitch because keeping innings alive matters a lot.

## Best Slowpitch Stats Ranked

Use these stats most heavily:

1. OBP
2. Out rate
3. SLG
4. OPS
5. Extra-base hit rate
6. Batting average
7. Runs scored
8. RBIs
9. Contact quality notes
10. Speed / baserunning notes

## Simple Hitter Score

Use this as the base score:

Softball Hitter Score = OBP + SLG

This rewards:

- Getting on base
- Hitting for extra bases

Optional role-based scores:

- Top-of-order score: OBP, low out rate, contact consistency, speed bonus
- Middle-order score: SLG, OPS, extra-base hit rate, RBI production
- Bottom-order / turnover score: OBP, contact ability, speed, low pop-up tendency

## Batting Order Recommendation

For a 10-player lineup:

1. Best OBP/contact hitter with speed
2. Best overall hitter
3. Strong contact + RBI hitter
4. Best power/damage hitter
5. Next-best power hitter
6. Best remaining hitter
7. Solid but flawed hitter
8. Weakest hitter
9. Contact hitter
10. Second leadoff / speed / contact hitter

For a 9-player lineup:

1. Best OBP/contact hitter
2. Best overall hitter
3. Strong RBI hitter
4. Best power hitter
5. Next-best power hitter
6. Best remaining hitter
7. Flawed hitter
8. Weakest hitter
9. Second leadoff / contact hitter

Important rule:

Do not automatically put the fastest player first. The leadoff hitter should be the player who gets on base the most. Speed is only a bonus.

## Lineup Role Definitions

### #1 Hitter

Best table-setter.

Should have:

- High OBP
- Low out rate
- Good contact
- Good speed if possible
- Rarely pops up

### #2 Hitter

Best overall hitter.

Should have:

- High OBP
- High SLG
- High OPS
- Strong consistency
- Ability to drive in the leadoff hitter

### #3 Hitter

Strong contact and RBI hitter.

Should have:

- Good average
- Good contact
- Some power
- Can score runners from 1B or 2B

### #4 Hitter

Best power/damage hitter.

Should have:

- Highest SLG
- Most doubles/triples/home runs
- Strong RBI production
- Does not pop up too much

### #5 Hitter

Next-best power hitter.

Should have:

- Good SLG
- Good RBI ability
- Can continue big innings

### #6 Hitter

Best remaining hitter.

Should have:

- Solid OBP
- Decent contact
- Some power

### #7 Hitter

Useful but flawed hitter.

Examples:

- Has power but inconsistent
- Gets singles but is slow
- Hits hard but makes too many outs

### #8 Hitter

Weakest hitter or one of the weakest hitters.

Usually lower OBP and higher out rate.

### #9 / #10 Hitter

Second leadoff type.

Should have:

- Decent OBP
- Good contact
- Speed if possible
- Ability to turn the lineup over

## Stats Entry Screen Layout

The Stats Entry screen should be built for live game use.

Main layout order:

1. Game situation header
2. Batting order strip
3. Current batter card
4. Batter result buttons
5. Compact runners-on-base panel
6. RBI controls, only if someone scored
7. After-play summary
8. Undo / Save Play + Next Batter

## Game Situation Header

Show:

- Inning
- Outs
- Score
- Current batter
- Base state
- Runs this inning, if run limit exists

Example:

```text
Top 3rd | 1 Out | Us 7 - Them 5
```

## Batting Order Strip

Show the batting order horizontally.

Each player should have:

- Name or initials
- Current status
- Previous result if available
- Highlight for current batter

Example:

```text
Alex | Maya | Jordan | Noa | Sam
```

Current batter should be visually clear.

## Current Batter Card

Show:

- Player name
- Lineup spot
- Current game stats
- Season stats
- Suggested role
- Notes

Example:

```text
Jordan
Role: Power hitter
Today: 2-for-3, 2B, 3 RBI
Season: .650 OBP, 1.050 SLG
```

## Batter Result Buttons

Use large buttons:

- 1B
- 2B
- 3B
- HR
- BB
- ROE
- FC
- SF
- Out
- DP

The analyst first taps the batter result. After the result is selected, the app auto-fills likely runner movement.

## Runner Advancement Tracking

After every batter, the app should collect:

1. What the batter did
2. Where each runner started
3. Where each runner ended
4. Whether anyone scored
5. Whether anyone was out on the bases
6. Whether the batter gets an RBI

The app should make this fast by using a visual diamond and auto-filling the most likely runner movement.

## Before Each At-Bat

The app should already know:

- Current batter
- Current inning
- Current outs
- Current score
- Runner on 1B, if any
- Runner on 2B, if any
- Runner on 3B, if any

Example:

```text
Before at-bat:

- Batter: Jordan
- Runner on 1B: Maya
- Runner on 2B: Alex
- Runner on 3B: Empty
- Outs: 1
```

## Auto-Advance Runner Rules

After the batter result is selected, the app should automatically move runners based on common slowpitch outcomes. The analyst should only need to edit the play if something different happened.

### Default Movement on a Single

Batter:

- Goes to 1B

Runner on 1B:

- Goes to 2B

Runner on 2B:

- Scores

Runner on 3B:

- Scores

Allow edits:

- Runner on 1B went to 3B
- Runner on 2B stopped at 3B
- Runner was thrown out
- Runner scored because of an error

### Default Movement on a Double

Batter:

- Goes to 2B

Runner on 1B:

- Goes to 3B

Runner on 2B:

- Scores

Runner on 3B:

- Scores

Allow edits:

- Runner on 1B scored
- Runner on 1B stopped at 2B
- Runner on 2B stopped at 3B
- Runner was thrown out at home

### Default Movement on a Triple

Batter:

- Goes to 3B

All runners:

- Score

### Default Movement on a Home Run

Batter:

- Scores

All runners:

- Score

### Default Movement on a Walk

Batter:

- Goes to 1B

Runner on 1B:

- Goes to 2B only if forced

Runner on 2B:

- Goes to 3B only if forced

Runner on 3B:

- Scores only if bases loaded

### Default Movement on an Out

Batter:

- Is out

Runners:

- Stay where they are

Allow edits:

- Runner advanced
- Runner scored
- Runner tagged up
- Runner was doubled off
- Runner was thrown out

### Default Movement on a Sac Fly

Batter:

- Is out

Runner on 3B:

- Scores

Other runners:

- Usually stay

Allow edits:

- Runner on 2B advanced to 3B
- Runner was thrown out
- No runner advanced

### Default Movement on Reached on Error

Batter:

- Goes to 1B

Suggested runner default:

- Runner on 1B goes to 2B
- Runner on 2B goes to 3B
- Runner on 3B scores

Allow edits:

- Any runner can stay
- Any runner can advance
- Any runner can score
- Any runner can be out

### Default Movement on Fielder's Choice

Batter:

- Goes to 1B

Lead forced runner:

- Usually out

Other runners:

- Advance if forced

Example with runner on 1B:

- Batter to 1B
- Runner on 1B out at 2B

Example with bases loaded:

- Batter to 1B
- Runner from 3B out at home
- Other runners advance if forced

Allow edits:

- Choose which runner was out
- Choose where each runner ended

### Default Movement on Double Play

Batter:

- Out

One runner:

- Also out

Other runners:

- Advance only if applicable

Allow edits:

- Select second out
- Choose where remaining runners ended

## Runner Editing Controls

After auto-advancement, show each runner with destination buttons.

Example:

```text
Maya started on 1B:

- Stayed
- To 2B
- To 3B
- Scored
- Out

Alex started on 2B:

- Stayed
- To 3B
- Scored
- Out

Jordan was the batter:

- Out
- To 1B
- To 2B
- To 3B
- Scored
```

The app should show these controls only when needed. Most normal plays should just require tapping "Save Play."

## Visual Diamond UI

Use a softball diamond view.

Example before play:

```text
        2B
      [Alex]

3B [Empty]     [Maya] 1B

       Home
```

Example after a double:

```text
        2B
      [Jordan]

3B [Maya]     [Empty] 1B

       Home
       Alex scored
```

Then the analyst taps:

- Save Play
- Edit Runner Movement

## RBI Logic

The app should calculate RBIs automatically but allow the analyst to override.

Credit RBI by default when a runner scores on:

- Single
- Double
- Triple
- Home Run
- Sac Fly
- Bases-loaded walk
- Productive out that scores a runner

Do not credit RBI by default when a runner scores on:

- Error
- Fielder's choice where the run scores because of a defensive mistake
- Double play, unless league/team rules allow it
- Separate baserunning mistake or overthrow after the main play

Add a toggle when someone scores:

Credit RBI to batter?

- Yes
- No

Default:

- Yes for hits and sac flies
- No for errors
- Yes for bases-loaded walks
- Optional for fielder's choice

## What to Store for Each Play

For every at-bat, store:

- Game ID
- Inning
- Batter ID
- Outs before play
- Bases before play
- Batter result
- Runner movements
- Runs scored
- RBIs
- Outs on play
- Bases after play
- Notes, optional

## What to Store for Each Runner Movement

For each runner involved in the play, store:

- Player ID
- Started at: Batter / 1B / 2B / 3B
- Ended at: 1B / 2B / 3B / Home / Out
- Advanced bases: 0 / 1 / 2 / 3 / 4
- Scored: Yes / No
- Out on bases: Yes / No
- RBI credited: Yes / No
- Advance reason: Hit / Walk / Error / Fielder's Choice / Sac Fly / Runner Decision

Example:

```text
Runner: Maya
Started at: 1B
Ended at: 3B
Advanced bases: 2
Scored: No
Out on bases: No
Advance reason: Batter double
```

## Fast User Flow

1. Analyst opens current batter card
2. App shows current base state
3. Analyst taps result: 1B, 2B, 3B, HR, BB, Out, ROE, FC, SF, DP
4. App auto-moves runners
5. App shows updated diamond
6. Analyst adjusts runner movement only if needed
7. Analyst confirms RBI if needed
8. Analyst taps Save Play
9. App updates score, outs, bases, batter stats, runner stats, and team stats
10. App moves to next batter

## After-Play Summary

After selecting the batter result and runner movement, show a simple summary before saving.

Example:

```text
Jordan: Double
Maya: 1B to 3B
Alex: Scored
Runs: +1
RBI: Jordan +1
Outs: Still 1
```

Buttons:

- Undo
- Edit
- Save Play + Next Batter

## Stats Created from Runner Tracking

Tracking runner movement allows the app to calculate:

- Runs scored
- RBIs
- Left on base
- Times on base
- Total bases
- Extra bases taken
- Outs on bases
- Productive outs
- Runner advancement rate
- RBI chances
- RBI conversion rate
- Scoring efficiency
- Double play risk
- How often a hitter keeps innings alive

Most important for lineup logic:

- OBP
- SLG
- OPS
- Out rate
- RBI chances
- RBI conversion rate
- Runs scored rate
- Runner advancement rate
- Double play risk

## Example Play

Situation before play:

- Runner on 1B: Maya
- Runner on 2B: Alex
- Runner on 3B: Empty
- Batter: Jordan
- Outs: 1

Batter result:

- Double

App default movement:

- Jordan to 2B
- Maya to 3B
- Alex scores

Analyst confirms:

- Save Play

Stored play:

```text
AtBat {
  inning: 2,
  batterId: "Jordan",
  outsBefore: 1,
  result: "2B",
  basesBefore: {
    first: "Maya",
    second: "Alex",
    third: null
  },
  runnerAdvancements: [
    {
      playerId: "Maya",
      fromBase: "1B",
      toBase: "3B",
      scored: false,
      out: false,
      rbiCredited: false,
      reason: "Hit"
    },
    {
      playerId: "Alex",
      fromBase: "2B",
      toBase: "HOME",
      scored: true,
      out: false,
      rbiCredited: true,
      reason: "Hit"
    },
    {
      playerId: "Jordan",
      fromBase: "BATTER",
      toBase: "2B",
      scored: false,
      out: false,
      rbiCredited: false,
      reason: "Hit"
    }
  ],
  runsScored: 1,
  rbis: 1,
  outsOnPlay: 0,
  basesAfter: {
    first: null,
    second: "Jordan",
    third: "Maya"
  }
}
```

## Suggested Data Models

```text
Player {
  id
  name
  bats
  throws
  primaryPosition
  speedRating
  notes
  isActive
  createdAt
  updatedAt
}

Game {
  id
  opponent
  date
  isHome
  teamScore
  opponentScore
  inning
  outs
  status
  notes
}

GameLineup {
  id
  gameId
  playerId
  battingOrderPosition
  isActive
}

AtBat {
  id
  gameId
  inning
  batterId
  outsBefore
  result
  basesBefore
  runsScored
  rbis
  outsOnPlay
  basesAfter
  notes
  createdAt
}

RunnerAdvancement {
  id
  atBatId
  playerId
  fromBase
  toBase
  advancedBases
  scored
  out
  rbiCredited
  reason
}
```

## Design Principles

The app should be:

- Fast
- Simple
- Mobile-friendly
- Easy to use during a live game
- Visual instead of spreadsheet-heavy
- Clear for amateur users
- Built around cards and buttons
- Forgiving with undo/edit options

Avoid making the user manually enter too much.

The app should guess common runner movement first, then let the analyst correct the play.

## UI Principles

Use:

- Large tap targets
- Simple cards
- Clear labels
- Minimal text during live stat entry
- Visual diamond for bases
- Color/status indicators for current batter and base runners
- Simple stat summaries
- Sticky save/undo controls

Avoid:

- Tiny tables during live entry
- Too many dropdowns
- Too many required fields
- Complex baseball scoring language
- Overly advanced analytics that do not fit amateur slowpitch

## Final Recommendation

The app should focus on simple offensive tracking and fast live-game entry.

The core live workflow should be:

1. Select the current batter result
2. Auto-advance runners
3. Show the updated diamond
4. Let the analyst make quick corrections
5. Confirm RBIs only when someone scores
6. Save the play
7. Move to the next batter

The core lineup logic should be:

1. Highest OBP/contact hitter first
2. Best overall hitter second
3. Strong contact/RBI hitter third
4. Best power hitter fourth
5. Next power hitter fifth
6. Best remaining hitter sixth
7. Flawed hitters lower
8. Weakest hitter around eighth
9. Contact/speed hitter last to turn the lineup over

The main purpose is to help an amateur team make better batting order decisions using stats that are realistic to collect:

- Hits
- Walks
- Outs
- Singles
- Doubles
- Triples
- Home runs
- Runs
- RBIs
- Runner movement
- Basic contact notes

Keep the product simple, fast, and useful.
