## MODIFIED Requirements

### Requirement: Game-Day Home Focus

The app SHALL expose a mobile-first signed-in home page at `/` that presents the active team's own game-day schedule context.

#### Scenario: Signed-in user has an upcoming game

- **WHEN** a signed-in user visits `/`
- **THEN** the first viewport shows the next scheduled opponent, local date/time, home/away side, lineup status, and start countdown
- **AND** Game Setup and lineup preparation remain available before the start window
- **AND** Start Game is visually dominant only when the game is eligible to start

#### Scenario: Next schedule row is a bye

- **WHEN** the nearest upcoming row is a bye
- **THEN** the first viewport labels the bye and its date clearly
- **AND** it also identifies the next playable game when one exists

#### Scenario: Season has no upcoming rows

- **WHEN** no upcoming schedule row exists
- **THEN** the home card says `Season schedule complete`
- **AND** it offers a Manage Schedule action

#### Scenario: Signed-out user opens the root route

- **WHEN** a signed-out user visits `/`
- **THEN** the first viewport shows the login-first experience defined by `team-authentication`
- **AND** team schedule data is not shown until the user signs in

### Requirement: Home Scope Boundary

The home page SHALL present account-scoped schedule state and navigation without implementing scoring controls.

#### Scenario: Signed-in user interacts with home actions

- **WHEN** the user selects Manage Schedule, Game Setup, Review Lineup, Edit Roster, or an eligible Start Game action
- **THEN** the app navigates to or invokes the existing account-scoped workflow
- **AND** live scoring remains on Stats Entry

#### Scenario: Signed-out user interacts with the root route

- **WHEN** the signed-out user opens `/`
- **THEN** the user is kept in the authentication flow
- **AND** no protected schedule or game action is exposed

## REMOVED Requirements

### Requirement: QuickScores Schedule Source

**Reason**: A hard-coded public schedule cannot represent each user's teams and conflicts with the team-managed schedule source of truth.

**Migration**: Replace QuickScores display and fallbacks with account-scoped schedule rows. Remove the parser, schedule API route, external source link, and source/freshness labels.
