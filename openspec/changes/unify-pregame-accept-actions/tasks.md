## 1. Pregame UX

- [x] 1.1 Rename the starting defense commit action from Save Defense to Accept.
- [x] 1.2 Add Generate and Reset actions to the starting defense card.
- [x] 1.3 Move Start Game out of the batting order card into its own standalone action area.

## 2. Persistence

- [x] 2.1 Make offense Accept and defense Accept use backend-confirmed preparation saves.
- [x] 2.2 Prevent Start Game from continuing when accepted preparation cannot be saved.

## 3. Verification

- [x] 3.1 Add focused regression coverage for backend-confirmed defense saves and failed preparation saves.
- [x] 3.2 Run typecheck, lint, full tests, and compliance review.
