## Why

The league requires a female leadoff hitter, and the lineup repeats from the
last slot back to the leadoff spot. When a male hitter bats directly before the
female leadoff hitter, an intentional walk scenario can maximize the league's
two-base walk advantage.

## What Changes

- Keep the strongest eligible female player in the leadoff spot.
- Prefer a male hitter in the final lineup spot whenever a male hitter is
  available after the leadoff hitter.
- Choose the final male hitter with the smallest disruption to the generated
  order and existing female spacing.
- Warn on edited lineups that have a female leadoff but do not place an
  available male hitter in the final slot.

## Impact

- Affected code: batting order recommendation and gender-rule validation.
- Affected tests: lineup recommendation and validation unit tests.
- No persistence, scoring, or UI layout changes are expected.
