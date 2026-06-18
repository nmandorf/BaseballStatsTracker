## ADDED Requirements

### Requirement: First Game Prisma Sync
The frontend SHALL mirror first-game state changes to the Prisma backend while
keeping local scoring usable when the backend is unavailable.

#### Scenario: Save game state
- **WHEN** the analyst starts a game, saves a play, undoes a play, or ends a
  game
- **THEN** the app saves the updated local state
- **AND** posts the same snapshot to the Prisma first-game API

#### Scenario: Backend unavailable
- **WHEN** Prisma is not configured or the API request fails
- **THEN** the frontend keeps the local state and does not block live scoring

#### Scenario: Reset game
- **WHEN** the analyst resets the first game
- **THEN** local state is reset
- **AND** the frontend requests deletion of the persisted first-game snapshot
