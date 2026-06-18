## 1. Spec And Framework Checks

- [x] 1.1 Read the relevant Next.js 16 App Router route-handler and client-component docs from `node_modules/next/dist/docs/`.
- [x] 1.2 Add OpenSpec requirements for backend-persisted team creation and player adds.

## 2. Backend Persistence

- [x] 2.1 Add Prisma helper functions to serialize a team with players, create/load a team, and add a player.
- [x] 2.2 Add route handlers for active team loading/creation and team-scoped player creation.
- [x] 2.3 Validate minimal request data and return useful error responses without exposing Prisma internals.

## 3. Client Sync

- [x] 3.1 Add client helpers that call the backend and update the local active-team mirror.
- [x] 3.2 Persist team creation from the setup gate before finishing onboarding.
- [x] 3.3 Persist roster add-player and active/inactive updates through backend sync when possible.

## 4. Verification

- [x] 4.1 Review existing team-storage coverage for client fallback payloads; backend route and Prisma shapes are covered by `yarn typecheck` and `yarn build`.
- [x] 4.2 Run `yarn lint`, `yarn typecheck`, relevant tests, and `yarn build`.
