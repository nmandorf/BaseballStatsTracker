## 1. OpenSpec

- [x] Define confirmed, account-scoped permanent team deletion.

## 2. Implementation

- [x] Add an owned-team backend deletion operation and DELETE route.
- [x] Add a client deletion boundary that reports structured API errors.
- [x] Replace immediate clearing with a mobile-friendly confirmation dialog.
- [x] Clear local team and game state only after confirmed backend deletion.

## 3. Verification

- [x] Add focused tests for request behavior, ownership enforcement, confirmation UI, and failure safety.
- [x] Run Yarn lint, typecheck, tests, and production build.
- [x] Check the finished change against engineering principles and product constraints.
