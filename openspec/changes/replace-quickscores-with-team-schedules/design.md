## Context

The app has durable `Team`, `Season`, and `Game` records, but schedule display comes from a hard-coded QuickScores adapter. Pregame setup is a single local-storage document shared by all games. Starting a game changes local state directly and has no authoritative time check. This change makes the database schedule the source of truth while preserving local live-scoring resilience after a game has legitimately started.

## Decisions

1. Model a season schedule as ordered weeks with explicit kinds.

   Add an ordered schedule-week record owned by a team and season. A week is either `GAME` or `BYE`. A game week references one durable `Game`; a bye has no game. Internal parsing exposes a discriminated union so the rest of the app cannot treat a bye as a playable game. Game-week validation requires an opponent, home/away side, and a scheduled start. Bye-week validation requires only its local calendar date.

2. Store the team's detected IANA timezone and an absolute game start.

   Team setup captures the browser's IANA timezone and presents familiar U.S. timezone names in a dropdown. If detection is missing or invalid, setup requires the user to select a valid timezone before schedule dates can be saved. Each game selection is limited to 7:00 PM, 8:00 PM, or 9:00 PM in that timezone and is stored as an absolute `scheduledStartAt`. The schedule also retains its local date for stable display. Daylight-saving conversion occurs at the input boundary instead of being repeated throughout UI code.

3. Make schedule completion an explicit team lifecycle state.

   New teams begin with schedule setup incomplete and cannot finish onboarding until at least one valid schedule row and at least one playable game are saved. Existing teams default to completed for backward compatibility. The migration marks teams owned by `noa01mandorf@gmail.com` incomplete so that tester account exercises the new schedule-format step. No other existing team is forced back through onboarding.

4. Save pregame preparation per game.

   Replace the singleton pregame document as the source of truth with game-scoped preparation. Selected players, the current generated/accepted batting positions, rules, and starting defense are loaded and saved by scheduled game ID. A generated or accepted lineup remains attached when opponent, date, or start time changes. Completed games and their preparation are immutable.

5. Separate start eligibility from the start action.

   A pure `getGameStartEligibility` decision receives game status, scheduled time, trusted current time, network verification state, and the team's active-game state. It returns a stable reason code and user message. The client uses it for countdown and disabled-state presentation; the server repeats the decision immediately before starting the game.

6. Make server time authoritative at the mutation boundary.

   The Start Game action calls a game-specific server endpoint. The server uses its own clock, rejects requests earlier than five minutes before first pitch, rejects cancelled/final games, and rejects a second in-progress game for the team. The state transition and active-game check run transactionally with serialization-conflict handling. The browser cannot bypass this rule through a direct Stats Entry URL or a stale enabled button.

7. Permit resilient scoring only after an authorized start.

   Starting requires an online server response. Once the server has marked the game `IN_PROGRESS` and the authorized local snapshot exists, the established local-first live scoring behavior may continue during a connection loss. Opening Stats Entry for a scheduled game still checks its persisted status and shows a locked state instead of creating a game locally.

8. Treat schedule editing according to lifecycle.

   Users may add rows, increase or decrease the editable schedule count, change future games to byes, change byes to games, reschedule, edit opponent or side, cancel games, and delete future rows that have not been cancelled or completed. Reducing the count requires confirmation before removing editable future rows. Completed games are read-only and cannot be rescheduled or deleted. Cancelled games remain visible and cannot be deleted because they are part of schedule history; they have no game-statistics link.

9. Keep the home and schedule UI mobile-first.

   The first viewport shows the closest upcoming schedule row. A bye is labeled clearly and the next playable game is also shown when one exists. A game shows opponent, local date/time, home/away, lineup status, and a live countdown. Start Game remains disabled until eligible, while Game Setup and lineup generation remain available. With no upcoming rows, the card says `Season schedule complete` and links to schedule management.

10. Keep completed-game statistics game-scoped.

    The schedule history links each completed game to the existing final-game statistics view backed by that game's persisted plays and statistics. Bye rows and cancelled games appear in schedule history but never expose a statistics link.

## Data Shape

- `Team`: add `timeZone` and `scheduleSetupCompleted`.
- `ScheduleWeek`: team, season, order, kind, local date, optional unique game relation, timestamps.
- `Game`: use an absolute scheduled start, add an explicit preparation lifecycle if needed, and retain existing status, lineup, rules, alignments, plays, and statistics relations.
- `GameLineup`: evolve to represent the selected player pool and optional generated/accepted batting position before start, or add an equivalently normalized game-participant record if migration constraints make that safer.

The implementation design checkpoint must select one normalized lineup representation and document its invariants before writing the migration. JSON or unvalidated player-ID arrays are not acceptable as the durable source of truth.

## Error Contract

Start and schedule mutations return stable codes, including:

- `GAME_START_TOO_EARLY`
- `GAME_START_TIME_UNVERIFIED`
- `TEAM_GAME_ALREADY_IN_PROGRESS`
- `GAME_NOT_STARTABLE`
- `SCHEDULE_WEEK_INVALID`
- `SCHEDULE_ENTRY_READ_ONLY`

Messages may include a safe eligible-at time or the active game ID, but must not expose account internals.

## Migration Plan

1. Add nullable/backward-compatible columns and new schedule tables.
2. Mark all existing teams schedule-complete by default so current accounts retain access.
3. Before changing tester data, run an account-scoped preflight that resolves `noa01mandorf@gmail.com` to the stored Firebase owner UID and lists the exact matching team IDs. Because `Team.ownerEmail` is nullable, the backfill must target the confirmed UID after resolution rather than relying only on the email column.
4. Require explicit confirmation that at least one expected tester team matched. If the email cannot be resolved or no expected team matches, stop the tester backfill with a useful report instead of silently succeeding or modifying another account.
5. Set `scheduleSetupCompleted = false` only for the confirmed tester team IDs/owner UID in an idempotent data backfill separate from the schema migration.
6. Do not invent schedule rows for existing teams; they see schedule management or, for the tester account, the required completion step.
7. Stop reads from QuickScores only after team-schedule empty states are functional.
8. Remove the QuickScores route, parser, footer wording, and tests after the new source is wired.

## Risks / Trade-offs

- A device clock can make a countdown misleading -> periodically calibrate display against server time and always recheck on the server.
- Two clients can race to start different games -> use a serializable transactional transition and test the conflict path.
- Schedule-count reduction can destroy preparation work -> show affected future rows and require confirmation; never remove completed games.
- Existing local singleton setup can leak between games -> key transitional local data by game ID and stop reading unscoped setup once migration completes.
- Timezone mistakes can shift future games -> store the IANA zone and absolute instant, display both clearly in edit confirmation, and test daylight-saving boundaries.
- A schema-wide lifecycle flag affects legacy users -> default legacy teams to complete and target only the confirmed tester email for forced upgrade.
- Optional legacy account email can make tester targeting ambiguous -> resolve and confirm the Firebase owner UID and exact team IDs before running the idempotent backfill; stop on zero or ambiguous matches.
- Browser timezone detection can be missing or invalid -> require an explicit valid timezone selection and prevent schedule save until resolved.

## Verification Strategy

- Pure tests for schedule validation, detected and manually selected timezones, invalid timezone rejection, timezone conversion, countdown boundaries, start eligibility, immutable states, and next-entry selection.
- API tests for account/team scoping, schedule mutations, server-clock enforcement, concurrent starts, and structured errors.
- UI tests for required onboarding, bye rows, per-game setup, locked countdown, auto-unlock, direct-route guard, empty schedule, cancellation, and game-specific history.
- Mobile browser verification at the smallest supported width, plus desktop layout and accessibility checks.
- Yarn test, lint, typecheck, build, Prisma validation, migration review, OpenSpec validation, and independent compliance review.
