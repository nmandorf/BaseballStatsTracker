## Why

Generic outs hide important slowpitch softball context. Tracking whether an out was a groundout, flyout, lineout, strikeout, or double play lets the app distinguish contact quality, productive outs, and rally-killing outcomes without making live stats entry feel slower.

## What Changes

- Keep the main Stats Entry result buttons simple, including a single `Out` button and a separate `DP` button.
- After the analyst taps `Out`, show a quick modal asking what kind of out happened: Groundout, Flyout, Lineout, Strikeout Looking, Strikeout Swinging, or Other Out.
- Store the selected `outType` with the plate appearance when the main result is `OUT`.
- Keep double plays tracked separately as `DP` and do not require an `outType` for them.
- Continue counting all normal out types as outs for basic stat calculations.
- Add derived contact and out-quality stats, including strikeout totals/rates, ball-in-play totals/rates, and productive out rate.
- Use out type as a small lineup recommendation tiebreaker, favoring lower strikeout rates, higher ball-in-play rates, productive contact, and penalizing double plays more heavily than normal outs.

## Capabilities

### New Capabilities
- `out-type-lineup-logic`: Covers out type capture during live stats entry, storage on plate appearances, derived contact/out-quality stats, and lineup recommendation tiebreakers based on out quality.

### Modified Capabilities

## Impact

- Affected UI: live Stats Entry result flow and a new reusable `OutTypeModal` component.
- Affected data: plate appearance/at-bat records gain an optional `outType` field for `OUT` results.
- Affected stats: player stat aggregation adds strikeout, ball-in-play, and productive out calculations while preserving existing PA, AB, AVG, OBP, SLG, OPS, out rate, runs, and RBI behavior.
- Affected lineup logic: recommendation scoring adds contact and out-quality tiebreakers without overriding reach-base, power, and run-production fundamentals.
- No new third-party dependency is expected.
