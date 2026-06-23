# Show Account Teams On Home

## Why

Signed-in analysts can select a team during login, but the home page does not show the other teams attached to their account. The static game checklist uses that space without helping users understand their available team workspaces.

## What Changes

- Replace the home page game checklist with a list of teams owned by the signed-in account.
- Identify the currently selected team in the list.
- Keep the teams card aligned with the Game Day card on desktop by scrolling overflowing team rows inside the card.
- Preserve the existing mobile-first layout and read-only home-page scope.

## Impact

- Affected specs: `home-page-foundation`
- Affected code: `src/sections/HomeHeroSection`, `src/components/AccountTeamsCard`

