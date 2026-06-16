## Why

The roster add-player form currently appears inline below the roster controls,
which makes the page feel like it has shifted into another mode without a clear
boundary. Adding a player should feel like a focused action that is distinct
from browsing and filtering the current roster.

## What Changes

- Open roster player creation in a centered modal dialog.
- Keep the existing player fields, save behavior, and cancel behavior.
- Preserve the roster page underneath so users can clearly tell they are adding
  a player on top of roster management.

## Non-Goals

- No new roster fields.
- No changes to player persistence or stat calculation behavior.
- No changes to onboarding player creation.

## Impact

- Affected specs: `team-onboarding-flow`.
- Affected code: roster section and player form presentation.
