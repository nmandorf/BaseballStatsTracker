## ADDED Requirements

### Requirement: Finish Game Return Home
The app SHALL allow the analyst to finish reviewing a final first game and
return to the home page without clearing the saved final game state.

#### Scenario: Analyst finishes a final game from stats
- **GIVEN** the first game status is final
- **WHEN** the analyst chooses Finish Game from the final Stats Entry summary
- **THEN** the app keeps the finalized game state persisted
- **AND** the app navigates to `/`
- **AND** the reset-new-game action remains separate from the finish action
