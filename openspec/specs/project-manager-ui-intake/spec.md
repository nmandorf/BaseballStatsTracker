## ADDED Requirements

### Requirement: UI Intake Signal Detection
The project manager SHALL detect when a tracked UI intake artifact exists in the repository.

#### Scenario: UI intake artifact exists
- **WHEN** the project contains `docs/ui-intake.md`
- **THEN** the project inspection result reports that UI intake material is available

#### Scenario: UI intake artifact is absent
- **WHEN** the project does not contain `docs/ui-intake.md`
- **THEN** the project inspection result reports that UI intake material is unavailable

### Requirement: Kanban Roadmap Item For UI Intake
The project manager SHALL include a Kanban roadmap item for reviewing and adding approved UI to the app.

#### Scenario: UI intake item is missing from Kanban
- **WHEN** existing Kanban tasks do not include the UI intake roadmap item
- **THEN** the project manager proposes creating the UI intake roadmap item

#### Scenario: UI intake item already exists on Kanban
- **WHEN** existing Kanban tasks include a normalized match for the UI intake roadmap item
- **THEN** the project manager does not propose a duplicate UI intake roadmap item

#### Scenario: UI intake artifact exists and done status is available
- **WHEN** the UI intake artifact exists and the Kanban board exposes a done-like status
- **THEN** the project manager proposes marking the UI intake roadmap item done if it is not already done

### Requirement: Secret-Free MCP Handling
The project SHALL NOT commit MCP provider API keys into tracked project files.

#### Scenario: MCP credentials are provided
- **WHEN** MCP credentials are needed for UI-provider access
- **THEN** credentials remain in local or ignored configuration rather than tracked source
