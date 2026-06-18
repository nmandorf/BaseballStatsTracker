## MODIFIED Requirements

### Requirement: Team Stats Auth Gate
The app SHALL require a signed-in Firebase user before showing team stats areas.

#### Scenario: Signed-out user opens a protected team stats route
- **WHEN** the user is not signed in
- **AND** the user opens Roster, Game Setup, Batting Order, Stats Entry, or Defense
- **THEN** the app shows a sign-in prompt instead of team data
- **AND** the prompt links to `/login`
