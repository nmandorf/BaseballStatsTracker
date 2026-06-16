## MODIFIED Requirements

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
