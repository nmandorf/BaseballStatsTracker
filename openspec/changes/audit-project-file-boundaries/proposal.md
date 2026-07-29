## Why

The first modularization pass reduced the largest React entry modules, but a
repository-wide inventory still shows several hand-written domain, storage,
backend, script, and presentation files with multiple independent
responsibilities. The project needs a complete file-boundary review so future
changes do not require loading unrelated persistence, normalization, scoring,
and rendering logic at once.

## What Changes

- Inventory every hand-written TypeScript, TSX, JavaScript, and MJS project
  file, excluding generated Prisma output and vendored dependencies.
- Review files using size, responsibility count, complexity, coupling,
  duplication, and change-risk signals instead of an arbitrary line limit.
- Split mixed domain, persistence, backend, script, and presentation modules
  into business-named modules while retaining stable public facade exports.
- Reuse existing components and pure helpers when the same responsibility is
  already represented elsewhere.
- Record the reviewed scope and the reason that intentionally cohesive files
  remain together.
- Preserve all product behavior, routes, storage formats, API contracts, stats
  rules, lineup rules, and mobile-first interaction ordering.

## Capabilities

### New Capabilities

- `project-file-boundaries`: Defines a repository-wide maintainability audit
  and stable responsibility boundaries for hand-written project files.

### Modified Capabilities

- None. This is a behavior-preserving maintainability change.

## Impact

- Affected code: large hand-written domain engines, persistence adapters,
  backend services, project scripts, and remaining presentation modules.
- APIs and data: existing import paths, public exports, routes, request shapes,
  database records, local-storage keys, and serialized game state remain
  compatible.
- Dependencies: no new runtime dependencies.
