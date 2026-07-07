"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CircleDotDashed, Plus, UsersRound } from "lucide-react";
import {
  loadAvailableTeamsFromBackend,
  useActiveTeam,
} from "@/lib/teamStorage";
import type { ActiveTeam } from "@/types/player";

type TeamsState =
  | { status: "loading"; teams: ActiveTeam[] }
  | { status: "ready"; teams: ActiveTeam[] }
  | { status: "unavailable"; teams: ActiveTeam[] };

export function AccountTeamsCard() {
  const activeTeam = useActiveTeam();
  const teamsState = useAccountTeams();

  return <AccountTeamsCardLayout activeTeamId={activeTeam?.id ?? null} teamsState={teamsState} />;
}

function useAccountTeams() {
  const [teamsState, setTeamsState] = useState<TeamsState>(getInitialTeamsState);

  useEffect(() => {
    let isMounted = true;

    void loadAccountTeamsState((nextState) => {
      if (isMounted) setTeamsState(nextState);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  return teamsState;
}

function getInitialTeamsState(): TeamsState {
  return { status: "loading", teams: [] };
}

async function loadAccountTeamsState(setTeamsState: (state: TeamsState) => void) {
  try {
    const teams = await loadAvailableTeamsFromBackend({ fallbackToActiveTeam: false });
    setTeamsState({ status: "ready", teams });
  } catch {
    setTeamsState({ status: "unavailable", teams: [] });
  }
}

function AccountTeamsCardLayout({
  activeTeamId,
  teamsState,
}: {
  activeTeamId: string | null;
  teamsState: TeamsState;
}) {
  return (
    <article className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm shadow-foreground/[0.025]">
      <AccountTeamsHeader teamsState={teamsState} />
      <Link className="btn-base btn-secondary mt-3 min-h-10 px-3 text-sm text-[var(--accent)]" href="/login">
        <Plus className="size-4" aria-hidden="true" />
        New team
      </Link>
      <AccountTeamsRegion activeTeamId={activeTeamId} teamsState={teamsState} />
    </article>
  );
}

function AccountTeamsHeader({ teamsState }: { teamsState: TeamsState }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-sm font-bold text-foreground">Your teams</p>
        <p className="mt-0.5 text-xs font-semibold text-[var(--muted-foreground)]">
          Teams on this account
        </p>
      </div>
      <AccountTeamsCountBadge teamsState={teamsState} />
    </div>
  );
}

function AccountTeamsCountBadge({ teamsState }: { teamsState: TeamsState }) {
  if (teamsState.status !== "ready") {
    return null;
  }

  return (
    <span className="rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-xs font-bold text-[var(--accent)]">
      {teamsState.teams.length}
    </span>
  );
}

function AccountTeamsRegion({
  activeTeamId,
  teamsState,
}: {
  activeTeamId: string | null;
  teamsState: TeamsState;
}) {
  return (
    <div aria-label="Teams on this account" className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1" role="region" tabIndex={0}>
      <AccountTeamsStateView activeTeamId={activeTeamId} teamsState={teamsState} />
    </div>
  );
}

function AccountTeamsStateView({
  activeTeamId,
  teamsState,
}: {
  activeTeamId: string | null;
  teamsState: TeamsState;
}) {
  if (teamsState.status === "loading") {
    return <AccountTeamsLoadingState />;
  }

  if (teamsState.status === "unavailable") {
    return <AccountTeamsUnavailableState />;
  }

  return <ReadyAccountTeams activeTeamId={activeTeamId} teams={teamsState.teams} />;
}

function AccountTeamsLoadingState() {
  return (
    <div className="flex min-h-20 items-center justify-center gap-2 rounded-lg bg-[var(--surface)] px-3 text-sm font-semibold text-[var(--muted-foreground)]">
      <CircleDotDashed className="size-4 animate-spin" aria-hidden="true" />
      Loading teams...
    </div>
  );
}

function AccountTeamsUnavailableState() {
  return (
    <div className="flex min-h-20 items-center justify-center rounded-lg bg-[var(--surface)] px-3 text-center text-sm font-semibold text-[var(--muted-foreground)]">
      Teams are unavailable right now. Try again later.
    </div>
  );
}

function ReadyAccountTeams({
  activeTeamId,
  teams,
}: {
  activeTeamId: string | null;
  teams: ActiveTeam[];
}) {
  if (!teams.length) {
    return (
      <div className="flex min-h-20 items-center justify-center rounded-lg bg-[var(--surface)] px-3 text-center text-sm font-semibold text-[var(--muted-foreground)]">
        No teams found for this account.
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      {teams.map((team) => (
        <AccountTeamRow isCurrentTeam={team.id === activeTeamId} key={team.id} team={team} />
      ))}
    </div>
  );
}

function AccountTeamRow({
  isCurrentTeam,
  team,
}: {
  isCurrentTeam: boolean;
  team: ActiveTeam;
}) {
  return (
    <div className="flex min-h-14 items-center gap-3 rounded-lg bg-[var(--surface)] px-3 py-2.5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--card)] text-[var(--accent)]">
        <UsersRound className="size-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-foreground">
          {team.name}
        </p>
        <p className="text-xs font-semibold text-[var(--muted-foreground)]">
          {formatTeamPlayerCount(team.players.length)}
        </p>
      </div>
      {isCurrentTeam ? (
        <span className="shrink-0 text-xs font-bold text-[var(--accent)]">
          Current
        </span>
      ) : null}
    </div>
  );
}

function formatTeamPlayerCount(playerCount: number) {
  return `${playerCount} player${playerCount === 1 ? "" : "s"}`;
}
