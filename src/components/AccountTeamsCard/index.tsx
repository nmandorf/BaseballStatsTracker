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
  const [teamsState, setTeamsState] = useState<TeamsState>({
    status: "loading",
    teams: [],
  });

  useEffect(() => {
    let isMounted = true;

    async function loadAccountTeams() {
      try {
        const teams = await loadAvailableTeamsFromBackend({
          fallbackToActiveTeam: false,
        });

        if (isMounted) {
          setTeamsState({ status: "ready", teams });
        }
      } catch {
        if (isMounted) {
          setTeamsState({ status: "unavailable", teams: [] });
        }
      }
    }

    void loadAccountTeams();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <article className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm shadow-foreground/[0.025]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-foreground">Your teams</p>
          <p className="mt-0.5 text-xs font-semibold text-[var(--muted-foreground)]">
            Teams on this account
          </p>
        </div>
        {teamsState.status === "ready" ? (
          <span className="rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-xs font-bold text-[var(--accent)]">
            {teamsState.teams.length}
          </span>
        ) : null}
      </div>

      <Link
        className="btn-base btn-secondary mt-3 min-h-10 px-3 text-sm text-[var(--accent)]"
        href="/login"
      >
        <Plus className="size-4" aria-hidden="true" />
        New team
      </Link>

      <div
        aria-label="Teams on this account"
        className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1"
        role="region"
        tabIndex={0}
      >
        {teamsState.status === "loading" ? (
          <div className="flex min-h-20 items-center justify-center gap-2 rounded-lg bg-[var(--surface)] px-3 text-sm font-semibold text-[var(--muted-foreground)]">
            <CircleDotDashed className="size-4 animate-spin" aria-hidden="true" />
            Loading teams...
          </div>
        ) : null}

        {teamsState.status === "ready" && teamsState.teams.length === 0 ? (
          <div className="flex min-h-20 items-center justify-center rounded-lg bg-[var(--surface)] px-3 text-center text-sm font-semibold text-[var(--muted-foreground)]">
            No teams found for this account.
          </div>
        ) : null}

        {teamsState.status === "unavailable" ? (
          <div className="flex min-h-20 items-center justify-center rounded-lg bg-[var(--surface)] px-3 text-center text-sm font-semibold text-[var(--muted-foreground)]">
            Teams are unavailable right now. Try again later.
          </div>
        ) : null}

        {teamsState.status === "ready" && teamsState.teams.length > 0 ? (
          <div className="grid gap-2">
            {teamsState.teams.map((team) => {
              const isCurrentTeam = team.id === activeTeam?.id;

              return (
                <div
                  className="flex min-h-14 items-center gap-3 rounded-lg bg-[var(--surface)] px-3 py-2.5"
                  key={team.id}
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--card)] text-[var(--accent)]">
                    <UsersRound className="size-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-foreground">
                      {team.name}
                    </p>
                    <p className="text-xs font-semibold text-[var(--muted-foreground)]">
                      {team.players.length} player{team.players.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  {isCurrentTeam ? (
                    <span className="shrink-0 text-xs font-bold text-[var(--accent)]">
                      Current
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </article>
  );
}
