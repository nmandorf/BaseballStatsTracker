## 1. Repository Audit

- [x] 1.1 Inventory every hand-written TS, TSX, JS, and MJS file.
- [x] 1.2 Collect size, complexity, coupling, duplication, coverage-path, and health signals.
- [x] 1.3 Record the final reviewed-file ledger and intentional no-split decisions.

## 2. Domain Boundaries

- [x] 2.1 Reduce mixed game-engine responsibilities behind stable public exports.
- [x] 2.2 Reduce mixed defense-engine responsibilities behind stable public exports.
- [x] 2.3 Separate lineup ranking, gender validation, and pregame lineup resolution where useful.

## 3. Persistence and Backend Boundaries

- [x] 3.1 Separate browser storage, normalization, and remote synchronization responsibilities.
- [x] 3.2 Separate schedule preparation, schedule persistence, and game snapshot responsibilities.
- [x] 3.3 Separate Prisma serialization/mapping responsibilities from transaction orchestration.

## 4. Remaining Modules

- [x] 4.1 Reduce remaining mixed presentation modules and reuse focused components.
- [x] 4.2 Reduce the project-management script where inspection, planning, and execution are independent.
- [x] 4.3 Review tests, routes, types, and small utilities for useful reductions without fragmenting cohesive suites.

## 5. Verification

- [x] 5.1 Validate this OpenSpec change strictly.
- [x] 5.2 Run lint, typecheck, unit tests, Prisma validation, production build, and browser E2E.
- [x] 5.3 Run structural health, duplication, dead-code, and diff checks.
- [x] 5.4 Complete an independent compliance review and resolve all material findings.
