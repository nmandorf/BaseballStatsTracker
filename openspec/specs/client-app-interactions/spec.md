# client-app-interactions Specification

## Purpose
TBD - created by archiving change add-client-app-interactions. Update Purpose after archive.
## Requirements
### Requirement: Local Screen Interactivity
The app SHALL provide responsive client-side interactions for the main app
screens without persisting data.

#### Scenario: User interacts with app shell controls
- **WHEN** the user filters roster players, toggles setup options, moves batting
  order rows, selects a batting result, edits runner movement, chooses RBI, uses
  pinch runner controls, presses undo, or saves the current play
- **THEN** the visible UI updates immediately in the browser
- **AND** the interaction uses local client state only
- **AND** no database write, API route, Server Action, or Prisma model is used

### Requirement: Stats Entry Local Flow
The stats entry screen SHALL support a local current-batter flow.

#### Scenario: User saves a local play
- **WHEN** the user selects a result, reviews runner movement, and presses
  "Save Play + Next Batter"
- **THEN** the screen advances to the next batter locally
- **AND** the summary reflects the selected play
- **AND** the implementation does not persist the play or calculate permanent
  player stats

