## ADDED Requirements

### Requirement: Account-Scoped Team Persistence
The app SHALL associate backend team records with the signed-in Firebase account
that creates or updates them.

#### Scenario: User creates a team on one device
- **WHEN** a signed-in user creates a team
- **THEN** the backend stores the team for that user's account
- **AND** another device signed into the same account can list and select that
  team

#### Scenario: User lists available teams
- **WHEN** a signed-in user opens team selection
- **THEN** the app lists teams stored for that account
- **AND** teams for other signed-in accounts are not shown

### Requirement: Account-Scoped Team Updates
The app SHALL apply roster and active-team updates to the signed-in account's
team record.

#### Scenario: User edits a selected team on another device
- **WHEN** a signed-in user selects an account team on one device
- **AND** edits roster data on another device signed into the same account
- **THEN** later team loads use the updated backend team record
