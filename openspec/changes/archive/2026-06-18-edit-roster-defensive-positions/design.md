## Context

`Player.primaryPosition` already flows through the player form, local active-team
storage, the team API, and Prisma. Roster cards currently omit the field and only
offer active-status and gender controls. The change should reuse the existing
update path, remain usable on a phone, and avoid a database migration.

## Goals / Non-Goals

**Goals:**

- Make every player's primary defensive position visible and editable on the
  Roster tab.
- Keep edits fast with a native select and large touch target.
- Save through the same local-first team update used by existing roster controls.
- Preserve an unexpected legacy value until the user deliberately replaces it.

**Non-Goals:**

- Building a per-game defensive alignment or inning-by-inning substitutions.
- Assigning multiple simultaneous positions to one player.
- Adding defensive ratings, recommendations, or game statistics.
- Changing the Prisma schema.

## Decisions

1. **Edit the existing primary position directly on each roster card.** This is
   the least surprising location and keeps the action close to the player. A
   separate team-wide alignment screen was considered, but that would imply a
   per-game fielding lineup that this change does not model.
2. **Use a native select with named slowpitch positions and an Unassigned
   option.** It is compact, keyboard accessible, and mobile friendly. Free text
   was considered, but it produces inconsistent labels and makes future lineup
   use harder.
3. **Keep supported values in one shared typed constant.** Both player creation
   and roster editing can use the same vocabulary without duplicating strings.
4. **Reuse `updateActiveTeamPlayers`.** It immediately updates the local mirror
   and queues the existing account-scoped backend sync, so position editing has
   the same offline tolerance as current roster edits.
5. **Render an unknown saved value as a temporary option.** Existing free-text
   data remains visible and is not erased merely by opening the roster.

## Risks / Trade-offs

- [A user may interpret primary position as the current game's alignment] → Label
  the control “Primary defense” and keep game-specific alignment out of scope.
- [Fire-and-forget backend sync can fail silently] → Preserve the local-first
  behavior already used across roster controls; broader sync-status UX is outside
  this focused change.
- [Legacy values may not match the new vocabulary] → Display them as a temporary
  selectable value until the user chooses a supported position or Unassigned.

## Migration Plan

No data migration is needed. Deploy the UI and shared position vocabulary. A
rollback removes the controls without changing stored player data.

## Open Questions

None.
