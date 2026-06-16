## ADDED Requirements

### Requirement: Static Main App Routes
The app SHALL expose the main planned app areas as static, mobile-first routes.

#### Scenario: User opens a planned app route
- **WHEN** a user visits `/roster`, `/game-setup`, `/batting-order`, or `/stats-entry`
- **THEN** the route renders a polished preview of that app area
- **AND** route files only compose page-layer modules
- **AND** the route does not mutate data, calculate live stats, advance runners,
  recommend a batting order, or write to the database

### Requirement: Existing Structure Preservation
The static app shell SHALL preserve the current source organization.

#### Scenario: Developer reviews shell implementation
- **WHEN** the implementation is inspected
- **THEN** route files live under `src/app`
- **AND** page-layer modules live under `src/pages`
- **AND** larger visual regions live under `src/sections`
- **AND** reusable display pieces live under `src/components`
- **AND** generated Prisma files are not edited

### Requirement: Stitch-Informed Static Screens
The static app shell SHALL use the same Stitch-informed visual language as the
approved home restyle.

#### Scenario: User reviews the app shell
- **WHEN** the user navigates between static screens
- **THEN** each screen uses compact cards, chips, dense mobile hierarchy,
  rounded app controls, and the shared green-neutral color palette
- **AND** controls that imply future behavior are visibly display-only,
  planned, or disabled
