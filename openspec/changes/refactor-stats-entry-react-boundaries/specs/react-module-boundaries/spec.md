## ADDED Requirements

### Requirement: Stats Entry uses focused React module boundaries
The live Stats Entry implementation SHALL separate route gating, interactive workflow state, pure play-form decisions, presentational UI, and completed-game reporting into purpose-specific modules.

#### Scenario: Developer inspects the Stats Entry section entry point
- **WHEN** a developer opens the Stats Entry section entry module
- **THEN** the module presents the supported product states and delegates each substantial responsibility to a named module
- **AND** the entry module does not also implement the full live workflow or completed-game report

#### Scenario: Developer changes live play-form behavior
- **WHEN** a developer changes local selection, correction, save, undo, or reset behavior
- **THEN** the interactive state and actions are owned by a dedicated Stats Entry hook
- **AND** pure validation and derivation decisions remain usable without rendering React

#### Scenario: User enters and saves a play
- **WHEN** a user follows the existing Stats Entry flow
- **THEN** the displayed screen order, runner controls, RBI controls, correction behavior, persistence, phase navigation, and final-game reporting remain behaviorally unchanged
