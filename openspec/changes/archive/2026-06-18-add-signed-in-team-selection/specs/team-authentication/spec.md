## ADDED Requirements

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
