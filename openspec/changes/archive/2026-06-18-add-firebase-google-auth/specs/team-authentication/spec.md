## ADDED Requirements

### Requirement: Firebase Sign-In Options
The app SHALL provide a Firebase Authentication login screen for Google and email sign-in.

#### Scenario: User opens the login screen
- **WHEN** the user visits `/login`
- **THEN** the app renders a FirebaseUI sign-in flow
- **AND** Google is offered as the sign-in provider
- **AND** Email/Password is offered as an alternate sign-in provider
- **AND** successful sign-in returns the user to the team stats app

### Requirement: Team Stats Auth Gate
The app SHALL require a signed-in Firebase user before showing team stats areas.

#### Scenario: Signed-out user opens a protected team stats route
- **WHEN** the user is not signed in
- **AND** the user opens Roster, Game Setup, Batting Order, or Stats Entry
- **THEN** the app shows a sign-in prompt instead of team data
- **AND** the prompt links to `/login`

### Requirement: Signed-In User Controls
The app SHALL show signed-in user context and a sign-out control.

#### Scenario: Signed-in user uses the app
- **WHEN** the user is signed in
- **THEN** the app header shows the user's display name or email
- **AND** the user can sign out from the header
