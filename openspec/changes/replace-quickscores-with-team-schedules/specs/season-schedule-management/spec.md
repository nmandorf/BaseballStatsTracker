## ADDED Requirements

### Requirement: Team-Managed Schedule Weeks

The app SHALL store an ordered, team-scoped season schedule whose rows are explicitly either a game or a bye.

#### Scenario: User defines the schedule size

- **WHEN** the user enters any positive number of schedule weeks
- **THEN** the app presents that many ordered schedule rows
- **AND** every row can be configured independently as Game or Bye

#### Scenario: User configures a game week

- **WHEN** a schedule row is Game
- **THEN** opponent, local calendar date, start time, and home/away side are required
- **AND** the available start times are exactly 7:00 PM, 8:00 PM, and 9:00 PM in the team's timezone

#### Scenario: User configures a bye week

- **WHEN** a schedule row is Bye
- **THEN** only its local calendar date is required
- **AND** it cannot be selected, prepared, or started as a game

#### Scenario: Initial schedule has no game

- **WHEN** every initial schedule row is configured as Bye
- **THEN** the schedule is not sufficient to complete new-team onboarding
- **AND** the app requests at least one Game row

#### Scenario: Same opponent or date appears more than once

- **WHEN** the schedule contains repeat opponents or multiple games on one date
- **THEN** each schedule row remains a distinct entry
- **AND** no uniqueness rule rejects the schedule solely for that repetition

### Requirement: Team Timezone

The app SHALL interpret scheduled dates and allowed start times in the team's detected IANA timezone.

The schedule editor SHALL present common U.S. timezones with familiar names in a dropdown while storing their valid IANA identifiers.

#### Scenario: New team reaches schedule setup

- **WHEN** the browser provides a valid IANA timezone
- **THEN** the app shows and stores that timezone for the team
- **AND** scheduled game instants are derived from the selected local date and allowed local start time

#### Scenario: Browser timezone is missing or invalid

- **WHEN** automatic timezone detection does not return a valid IANA timezone
- **THEN** the app asks the user to select a valid timezone from the dropdown
- **AND** schedule save remains disabled until a valid timezone is selected
- **AND** the app does not silently substitute a different timezone

#### Scenario: Daylight-saving offset differs on game day

- **WHEN** the scheduled date has a different UTC offset from the setup date
- **THEN** the stored game instant uses the offset that applies on the scheduled date in the team timezone

### Requirement: Schedule Management

The app SHALL let users maintain editable schedule rows after onboarding without changing immutable completed games.

#### Scenario: User increases the schedule count

- **WHEN** the user increases the desired schedule-week count
- **THEN** the app adds editable future rows
- **AND** existing rows and their game preparation remain unchanged

#### Scenario: User decreases the schedule count

- **WHEN** reducing the count would remove editable future rows
- **THEN** the app identifies the affected rows and requests confirmation
- **AND** it does not remove completed rows

#### Scenario: User edits a future game

- **WHEN** the user changes its opponent, date, allowed time, or home/away side
- **THEN** the schedule reflects the change
- **AND** that game's saved active players, lineup, rules, and defense remain attached

#### Scenario: User changes the week kind

- **WHEN** an editable row changes between Game and Bye
- **THEN** the app validates the fields required by the new kind
- **AND** it warns before discarding game preparation that cannot belong to a bye

#### Scenario: User cancels a game

- **WHEN** an upcoming game is cancelled
- **THEN** it remains in schedule history with Cancelled status
- **AND** it can never be started

#### Scenario: User attempts to delete a cancelled game

- **WHEN** a cancelled game is already part of schedule history
- **THEN** deletion is rejected
- **AND** its cancelled entry remains visible

#### Scenario: User edits a completed game

- **WHEN** a completed game is viewed in schedule management
- **THEN** it is read-only
- **AND** reschedule and delete operations are rejected by both UI and backend

### Requirement: Game-Scoped Preparation

The app SHALL persist pregame choices separately for every scheduled game.

#### Scenario: User prepares a scheduled game

- **WHEN** the user selects active players, game rules, a generated or edited batting order, and starting defense
- **THEN** those choices are stored for the selected scheduled game
- **AND** opening a different game does not display or overwrite those choices

#### Scenario: User returns before game day

- **WHEN** the user reopens a previously prepared game
- **THEN** its latest generated or accepted lineup and starting defense are restored

### Requirement: Server-Verified Start Window

The app SHALL authorize a scheduled game start no earlier than five minutes before its scheduled start using trusted server time.

#### Scenario: Game is more than five minutes away

- **WHEN** trusted current time is earlier than the scheduled start minus five minutes
- **THEN** Start Game is disabled
- **AND** the UI shows when it will become available while lineup preparation remains available

#### Scenario: Start window opens

- **WHEN** trusted current time reaches the scheduled start minus five minutes
- **THEN** the Start Game action becomes eligible without requiring a page refresh
- **AND** the server rechecks eligibility before changing game status

#### Scenario: Scheduled start has passed

- **WHEN** the game is still scheduled and has not been cancelled or completed
- **THEN** it remains eligible to start

#### Scenario: Server time cannot be verified

- **WHEN** the user attempts to start while offline or the server cannot verify the request
- **THEN** the game does not start
- **AND** the app explains that an internet connection is required to verify game time

#### Scenario: Client bypasses the disabled control

- **WHEN** an early start is attempted through a direct route, stale tab, or crafted request
- **THEN** no live game state is initialized
- **AND** the server returns a stable not-startable reason

### Requirement: One Active Game Per Team

The app SHALL prevent a team from starting a second game while another game is in progress.

#### Scenario: Another game is already active

- **WHEN** a start request is made for a different scheduled game
- **THEN** the request is rejected transactionally
- **AND** the user is directed to the active game

#### Scenario: Two clients start different games concurrently

- **WHEN** both start requests race for the same team
- **THEN** at most one game becomes in progress
- **AND** the other request receives a stable conflict response

### Requirement: Schedule History Semantics

The app SHALL preserve past schedule context while exposing statistics only for completed games.

#### Scenario: Schedule history is opened

- **WHEN** completed games, cancelled games, or past bye weeks exist
- **THEN** each entry appears with its date, kind, and status
- **AND** only completed games link to game-specific statistics
