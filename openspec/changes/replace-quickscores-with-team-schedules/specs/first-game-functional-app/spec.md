## MODIFIED Requirements

### Requirement: Pregame Lineup Approval Flow

The app SHALL guide the user from a selected scheduled game through game-specific setup and lineup approval before live stats entry starts.

#### Scenario: Generate lineup for a scheduled game

- **WHEN** the user selects an upcoming scheduled game and its active players
- **THEN** the app generates a batting order from those players using season stats, approved slowpitch lineup priorities, and league gender rules
- **AND** the generated order, game rules, and starting defense are saved for that scheduled game
- **AND** another scheduled game's preparation remains independent

#### Scenario: Coach accepts lineup before the start window

- **WHEN** the coach reviews the generated batting order before game time
- **THEN** the coach can move hitters and accept the lineup
- **AND** the app warns when the edited lineup does not place a female player first
- **AND** the accepted lineup remains saved even though Start Game is locked

#### Scenario: Coach starts an eligible game

- **WHEN** the accepted lineup and defense are valid and trusted server time is no earlier than five minutes before the scheduled start
- **THEN** starting initializes live stats entry from that scheduled game's saved preparation
- **AND** the game status changes to in progress before scoring controls are available

#### Scenario: Coach opens Stats Entry too early

- **WHEN** the selected game is still outside its start window
- **THEN** Stats Entry shows a locked game state and eligible-at time
- **AND** it does not initialize a live scoring snapshot

### Requirement: First Game Prisma Sync

The frontend SHALL mirror authorized scheduled-game state changes to the Prisma backend while keeping local scoring usable after a game has started.

#### Scenario: Start scheduled game

- **WHEN** the analyst requests Start Game
- **THEN** the backend verifies account access, schedule state, trusted time, and the team's active game before authorizing the transition
- **AND** the frontend creates or updates its local live snapshot only after authorization succeeds

#### Scenario: Save in-progress game state

- **WHEN** the analyst saves a play, undoes a play, or ends an authorized in-progress game
- **THEN** the app saves the updated local state
- **AND** posts the same game-scoped snapshot to the Prisma backend

#### Scenario: Backend becomes unavailable after start

- **WHEN** an already authorized in-progress game loses connectivity
- **THEN** the frontend keeps its local state and remains usable for live scoring
- **AND** it retries synchronization without authorizing any different scheduled game

#### Scenario: Backend unavailable before start

- **WHEN** a scheduled game has not been authorized and the backend is unavailable
- **THEN** no local in-progress game is created
- **AND** the UI explains that online time verification is required
