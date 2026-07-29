## ADDED Requirements

### Requirement: Every hand-written project file receives a boundary review

The project SHALL maintain an inventory-driven review of every hand-written
TypeScript, TSX, JavaScript, and MJS file, excluding generated and vendored
output.

#### Scenario: Maintainer reviews the modularity audit

- **WHEN** the repository-wide file audit is completed
- **THEN** every hand-written project file is included in the reviewed scope
- **AND** oversized or high-risk modules have an explicit split or no-split
  decision

### Requirement: Modules own coherent business responsibilities

Production modules SHALL group code by coherent business responsibility and
SHALL separate pure decisions from framework, database, network, and browser
side effects when that separation reduces change risk.

#### Scenario: Developer changes one business responsibility

- **WHEN** a developer changes game rules, defensive assignment, lineup
  ranking, schedule persistence, backend mapping, or a presentation card
- **THEN** unrelated responsibilities do not need to be understood or modified
- **AND** the owning module has a business-meaningful name

### Requirement: Existing contracts remain compatible

The modularization SHALL preserve existing public imports, routes, persistence
formats, request and response contracts, and product behavior.

#### Scenario: Existing consumer uses a compatibility facade

- **WHEN** an existing page, component, test, or route imports an established
  engine, storage, or backend entry point
- **THEN** the imported public contract remains available
- **AND** the behavior is unchanged after implementation moves to focused
  modules

### Requirement: Mobile-first product workflows remain unchanged

Presentation extraction SHALL preserve the mobile-first order, labels, tap
targets, state transitions, and save behavior of live Stats Entry and related
game workflows.

#### Scenario: Analyst records a live play

- **WHEN** the analyst selects a result, confirms runner movement and RBI, and
  saves the play
- **THEN** the interaction order and visible controls remain unchanged
- **AND** the same game, player, runner, score, outs, and batting-order updates
  are persisted
