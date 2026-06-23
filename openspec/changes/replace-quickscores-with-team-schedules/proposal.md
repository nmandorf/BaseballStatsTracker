# Change: Replace QuickScores with team-managed schedules

## Why

The home page currently reads a hard-coded QuickScores schedule for one team, while every account needs its own schedule. Team creation also produces one shared local pregame setup, so scheduled games cannot safely own separate active players, lineups, rules, defensive alignments, or start eligibility.

## What Changes

- Remove the QuickScores fetcher, API route, source links, footer copy, fallback behavior, and specification requirement.
- Extend new-team onboarding to require team name, initial roster, and a team schedule before setup is complete.
- Let the user choose any positive number of schedule weeks and define each week as either a game or a bye.
- Require opponent, date, 7:00 PM / 8:00 PM / 9:00 PM local start time, and home/away side for game weeks; require only a date for bye weeks.
- Add schedule management for adding, editing, rescheduling, cancelling, and deleting eligible future entries.
- Persist active-player selection, generated or accepted batting order, game rules, and starting defense per scheduled game.
- Allow lineup preparation at any time, but prevent game start until five minutes before the scheduled time using server-verified time.
- Block early starts from every entry path, block offline starts, and allow only one in-progress game per team.
- Replace the home card with the next team-managed schedule entry, countdown, and lineup status.
- Keep completed games read-only with game-specific history and statistics; retain cancelled games in schedule history without statistics.
- Leave existing teams outside `noa01mandorf@gmail.com` out of the new required-onboarding gate. Mark that tester account's existing teams for schedule-format completion.

## Non-goals

- External schedule synchronization, notifications, calendar import/export, recurring schedules, and start times outside 7:00 PM, 8:00 PM, or 9:00 PM.
- Replacing the existing live scoring engine or changing baseball-stat calculations.

## Impact

- Affected specs: `season-schedule-management` (new), `team-onboarding-flow`, `home-page-foundation`, `first-game-functional-app`, `completed-game-results`
- Affected code: Prisma schema and migration, team onboarding, schedule APIs and UI, home game-day card, game setup, batting order persistence, start authorization, Stats Entry route guards, completed-game history, and focused tests
- The implementation requires a backward-compatible data migration and removal of the QuickScores integration.
