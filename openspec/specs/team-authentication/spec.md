# team-authentication Specification

## Purpose
Define sign-in, protected team access, signed-in user controls, and account-scoped team behavior.
## Requirements
### Requirement: Firebase Sign-In Options
The app SHALL provide a Firebase Authentication login screen for Google sign-in and explicit email/password controls for both existing-account login and new-account creation.

#### Scenario: User opens the login screen
- **WHEN** the user visits `/login`
- **THEN** the app renders a FirebaseUI Google sign-in flow
- **AND** Google is offered as a sign-in provider
- **AND** the app shows an explicit email/password Log in control for existing users
- **AND** the app shows an explicit Create account control for new email users
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

### Requirement: Signed-In Team Selection
The app SHALL show a signed-in user the teams available from the database before entering protected team stat areas.

#### Scenario: Signed-in user opens the login screen
- **WHEN** the user is signed in
- **AND** the user visits `/login`
- **THEN** the app lists the available teams from the backend
- **AND** the user can choose a team to make it active
- **AND** choosing a team sends the user to the team stats app

### Requirement: Signed-In Team Creation
The app SHALL allow a signed-in user to create a new team from the team selection screen.

#### Scenario: Signed-in user creates a team
- **WHEN** the user enters a team name
- **AND** submits the create team form
- **THEN** the app persists the team to the database
- **AND** creates current-season scaffolding for that team
- **AND** makes the new team the active team
- **AND** opens the team stats app for that team

### Requirement: Active Team Database Updates
The app SHALL write roster and stats changes to the database for the currently selected team.

#### Scenario: User updates data after selecting a team
- **WHEN** the user has selected a team from the signed-in team selector
- **AND** roster or first-game stats are saved
- **THEN** the update targets the selected team ID in the backend

### Requirement: Login-First Root Entry
The app SHALL present a login-first experience to signed-out users who open the root route.

#### Scenario: Signed-out user opens the root route
- **WHEN** the user is not signed in
- **AND** the user visits `/`
- **THEN** the first screen presents the Firebase login experience
- **AND** the screen offers Google sign-in, email login, and email account creation
- **AND** the screen does not expose protected team stats data

#### Scenario: Signed-in user opens the root route
- **WHEN** the user is signed in
- **AND** the user visits `/`
- **THEN** the app shows the signed-in team stats home experience
- **AND** the app does not require the user to sign in again

### Requirement: Firebase OAuth Domain Guidance
The app SHALL provide actionable guidance when Google sign-in fails because the current domain is not authorized for Firebase OAuth.

#### Scenario: Google sign-in starts from an unauthorized domain
- **WHEN** Firebase returns `auth/unauthorized-domain` during Google sign-in
- **THEN** the login screen shows a safe error message
- **AND** the message tells the developer or project owner to add the current host in Firebase Console Authentication authorized domains
- **AND** the message does not expose secrets or Firebase private configuration

#### Scenario: Developer configures Firebase OAuth domains
- **WHEN** the app is prepared for local or deployed Google sign-in
- **THEN** project documentation identifies that the browser host used for sign-in must be listed in Firebase Console Authentication authorized domains
- **AND** the documented hosts include local development and the stable deployed app host when those hosts are known

### Requirement: Account-Scoped Team Persistence
The app SHALL associate backend team records with the signed-in Firebase account that creates or updates them.

#### Scenario: User creates a team on one device
- **WHEN** a signed-in user creates a team
- **THEN** the backend stores the team for that user's account
- **AND** another device signed into the same account can list and select that team

#### Scenario: User lists available teams
- **WHEN** a signed-in user opens team selection
- **THEN** the app lists teams stored for that account
- **AND** teams for other signed-in accounts are not shown

### Requirement: Account-Scoped Team Updates
The app SHALL apply roster and active-team updates to the signed-in account's team record.

#### Scenario: User edits a selected team on another device
- **WHEN** a signed-in user selects an account team on one device
- **AND** edits roster data on another device signed into the same account
- **THEN** later team loads use the updated backend team record
