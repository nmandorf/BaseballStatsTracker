import type { RefObject } from "react";
import { RotateCcw, Search, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  formatRosterFilterLabel,
  type RosterFilter,
} from "./rosterDecisions";

export function RosterToolbar({
  deleteTeamTriggerRef,
  filter,
  onAddPlayer,
  onOpenClearTeamDialog,
  onQueryChange,
  onResetTeam,
  onSetFilter,
  query,
}: {
  deleteTeamTriggerRef: RefObject<HTMLButtonElement | null>;
  filter: RosterFilter;
  onAddPlayer: () => void;
  onOpenClearTeamDialog: () => void;
  onQueryChange: (query: string) => void;
  onResetTeam: () => void;
  onSetFilter: (filter: RosterFilter) => void;
  query: string;
}) {
  return (
    <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--card)] p-3 shadow-sm shadow-foreground/[0.035]">
      <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
        <RosterSearchField onQueryChange={onQueryChange} query={query} />
        <RosterToolbarActions
          deleteTeamTriggerRef={deleteTeamTriggerRef}
          filter={filter}
          onAddPlayer={onAddPlayer}
          onOpenClearTeamDialog={onOpenClearTeamDialog}
          onResetTeam={onResetTeam}
          onSetFilter={onSetFilter}
        />
      </div>
    </div>
  );
}

function RosterSearchField({
  onQueryChange,
  query,
}: {
  onQueryChange: (query: string) => void;
  query: string;
}) {
  return (
    <label className="flex min-h-11 items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm font-semibold text-[var(--muted-foreground)]">
      <Search className="size-4" aria-hidden="true" />
      <input
        className="w-full bg-transparent text-foreground outline-none placeholder:text-[var(--muted-foreground)]"
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder="Search players"
        value={query}
      />
    </label>
  );
}

function RosterToolbarActions({
  deleteTeamTriggerRef,
  filter,
  onAddPlayer,
  onOpenClearTeamDialog,
  onResetTeam,
  onSetFilter,
}: {
  deleteTeamTriggerRef: RefObject<HTMLButtonElement | null>;
  filter: RosterFilter;
  onAddPlayer: () => void;
  onOpenClearTeamDialog: () => void;
  onResetTeam: () => void;
  onSetFilter: (filter: RosterFilter) => void;
}) {
  return (
    <div className="grid min-w-0 grid-cols-2 gap-2 sm:flex sm:flex-wrap">
      {(["all", "active", "inactive"] as const).map((rosterFilter) => (
        <RosterFilterButton
          active={filter === rosterFilter}
          filter={rosterFilter}
          key={rosterFilter}
          onSetFilter={onSetFilter}
        />
      ))}
      <button
        className="btn-base btn-primary min-h-10 min-w-0 rounded-full px-3 text-xs leading-tight"
        onClick={onAddPlayer}
        type="button"
      >
        <UserPlus className="size-4" aria-hidden="true" />
        Add Player
      </button>
      <button
        className="btn-base btn-secondary min-h-10 min-w-0 rounded-full px-3 text-xs leading-tight"
        onClick={onResetTeam}
        type="button"
      >
        <RotateCcw className="size-4" aria-hidden="true" />
        Reset Game
      </button>
      <button
        className="btn-base btn-danger-secondary min-h-10 min-w-0 rounded-full px-3 text-xs leading-tight"
        onClick={onOpenClearTeamDialog}
        ref={deleteTeamTriggerRef}
        type="button"
      >
        Clear Team
      </button>
    </div>
  );
}

function RosterFilterButton({
  active,
  filter,
  onSetFilter,
}: {
  active: boolean;
  filter: RosterFilter;
  onSetFilter: (filter: RosterFilter) => void;
}) {
  return (
    <button
      className={cn(
        "btn-base min-h-10 min-w-0 rounded-full px-3 text-center text-xs",
        active ? "btn-choice-selected" : "btn-choice",
      )}
      aria-pressed={active}
      onClick={() => onSetFilter(filter)}
      type="button"
    >
      {formatRosterFilterLabel(filter)}
    </button>
  );
}
