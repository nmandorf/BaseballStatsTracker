# home-page-foundation Specification

## Purpose
Define the mobile-first game-day home page, schedule context, navigation scope, and use of the app's established UI system.
## Requirements
### Requirement: Game-Day Home Focus
The app SHALL expose a mobile-first signed-in home page at `/` that presents Kobe's Peeps game-day context instead of a product dashboard or feature explainer after the Firebase auth path is satisfied.

#### Scenario: Signed-in user opens the root route
- **WHEN** a signed-in user visits `/`
- **THEN** the first viewport shows Kobe's Peeps game context
- **AND** the next game opponent, time, field, home/away side, and schedule source are prominent when available
- **AND** there is one dominant Start Game action
- **AND** secondary navigation actions are visually subordinate to Start Game
- **AND** the page avoids marketing-style feature explanation sections

#### Scenario: Signed-out user opens the root route
- **WHEN** a signed-out user visits `/`
- **THEN** the first viewport shows the login-first experience defined by `team-authentication`
- **AND** the game-day home context is not shown until the user signs in

### Requirement: QuickScores Schedule Source
The home page SHALL read the public QuickScores team schedule for game logistics.

#### Scenario: Schedule loads successfully
- **WHEN** the public QuickScores schedule can be fetched and parsed
- **THEN** the page shows the next playable Kobe's Peeps game after the current date
- **AND** if the next listing is a bye, the page notes the bye and shows the later playable game
- **AND** the page includes a source/freshness label for QuickScores

#### Scenario: Schedule is unavailable or no playable game is found
- **WHEN** the schedule cannot be fetched, cannot be parsed, or no later playable game exists
- **THEN** the page shows a clear fallback state
- **AND** the Start Game navigation remains available

### Requirement: Home Scope Boundary
The home page SHALL remain navigation and schedule display only for signed-in users.

#### Scenario: Signed-in user interacts with home actions
- **WHEN** the user selects Start Game, Review Lineup, or Edit Roster
- **THEN** the app navigates to the existing route
- **AND** no new scoring, runner movement, RBI, ranking, or database persistence behavior is introduced

#### Scenario: Signed-out user interacts with the root route
- **WHEN** the signed-out user opens `/`
- **THEN** the user is kept in the authentication flow
- **AND** no game-day home action exposes protected team data before sign-in

### Requirement: Local UI System Usage
The home page SHALL use the project's existing UI system conventions.

#### Scenario: Developer inspects implementation
- **WHEN** the homepage implementation is reviewed
- **THEN** `src/app/page.tsx` renders the home screen module without creating a duplicate `/Home` route
- **AND** larger page regions are implemented as sections
- **AND** small display elements are implemented as components
- **AND** styling uses Tailwind utilities, CSS variables, `cn()`, and lucide icons available in the repository
