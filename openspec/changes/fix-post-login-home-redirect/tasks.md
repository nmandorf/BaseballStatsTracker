## 1. OpenSpec

- [x] Define Home as the default post-login destination.

## 2. Implementation

- [x] Make the login component default to Home after team selection.
- [x] Preserve an intentionally selected protected-route destination through sign-in.
- [x] Return to Home after sign-out so a stale Game route does not become the next default.
- [x] Preserve safe handling for intentionally supplied local redirects.

## 3. Verification

- [x] Add a regression test for the post-login destination contract.
- [x] Run Yarn lint, typecheck, and tests.
- [ ] Run the production build. (Rerun blocked by local approval-service usage limit.)
- [x] Verify the login navigation with focused local regression tests.
- [x] Complete a compliance review against project guidance and this change.
