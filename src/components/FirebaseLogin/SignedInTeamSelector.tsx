"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Plus, RefreshCw, UsersRound } from "lucide-react";
import { hydrateFirstGameStateFromPrisma, prepareFirstGameStateForTeam } from "@/lib/firstGameStorage";
import { createDefaultPregameSetup, savePregameSetup } from "@/lib/pregameSetupStorage";
import {
  createBackendTeam,
  loadActiveTeam,
  loadAvailableTeamsFromBackend,
  saveActiveTeam,
} from "@/lib/teamStorage";
import { cn } from "@/lib/utils";
import type { ActiveTeam } from "@/types/player";

export function SignedInTeamSelector({
  onTeamSelected,
  redirectTo,
}: {
  onTeamSelected?: (team: ActiveTeam) => void;
  redirectTo: string;
}) {
  const router = useRouter();
  const [teams, setTeams] = useState<ActiveTeam[]>([]);
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null);
  const [teamName, setTeamName] = useState("");
  const [isLoadingTeams, setIsLoadingTeams] = useState(true);
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);
  const [isSelectingTeamId, setIsSelectingTeamId] = useState<string | null>(null);
  const [teamError, setTeamError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    void loadAvailableTeamsFromBackend()
      .then((availableTeams) => {
        if (!isMounted) return;
        setTeams(availableTeams);
        setActiveTeamId(loadActiveTeam()?.id ?? null);
      })
      .catch((error) => {
        if (isMounted) setTeamError(getErrorMessage(error, "Teams could not be loaded."));
      })
      .finally(() => {
        if (isMounted) setIsLoadingTeams(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  async function activateTeamForLogin(team: ActiveTeam) {
    const previousTeam = loadActiveTeam();
    saveActiveTeam(team);
    prepareFirstGameStateForTeam(previousTeam, team);
    savePregameSetup(createDefaultPregameSetup(team));
    await hydrateFirstGameStateFromPrisma({ force: true });
    onTeamSelected?.(team);
  }

  async function chooseTeam(team: ActiveTeam) {
    setIsSelectingTeamId(team.id);
    setTeamError(null);
    await activateTeamForLogin(team);
    router.replace(redirectTo);
  }

  async function createTeam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextTeamName = teamName.trim();

    if (!nextTeamName) {
      setTeamError("Team name is required.");
      return;
    }

    setIsCreatingTeam(true);
    setTeamError(null);
    try {
      const team = await createBackendTeam(nextTeamName);
      await activateTeamForLogin(team);
      setTeams((currentTeams) => [team, ...currentTeams.filter((currentTeam) => currentTeam.id !== team.id)]);
      setTeamName("");
      router.replace(redirectTo);
    } catch (error) {
      setTeamError(getErrorMessage(error, "Team could not be created."));
    } finally {
      setIsCreatingTeam(false);
    }
  }

  async function refreshTeams() {
    setIsLoadingTeams(true);
    setTeams(await loadAvailableTeamsFromBackend());
    setActiveTeamId(loadActiveTeam()?.id ?? null);
    setIsLoadingTeams(false);
  }

  return (
    <div className="grid gap-5">
      <form className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3" onSubmit={createTeam}>
        <label className="grid gap-2">
          <span className="text-xs font-bold uppercase tracking-normal text-[var(--muted-foreground)]">New team</span>
          <span className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <input
              className="min-h-11 rounded-lg border border-[var(--border)] bg-white px-3 text-sm font-semibold text-foreground outline-none placeholder:text-[var(--muted-foreground)] focus:border-[var(--accent)]"
              onChange={(event) => setTeamName(event.target.value)}
              placeholder="Team name"
              value={teamName}
            />
            <button className="btn-base btn-primary min-h-11 px-4 text-sm" disabled={isCreatingTeam || !teamName.trim()} type="submit">
              <Plus className="size-4" aria-hidden="true" />
              {isCreatingTeam ? "Adding" : "Add Team"}
            </button>
          </span>
        </label>
      </form>
      <div className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-black text-foreground">Available teams</h3>
          <button className="btn-base btn-secondary min-h-9 px-3 text-xs text-[var(--muted-foreground)]" disabled={isLoadingTeams} onClick={() => void refreshTeams()} type="button">
            <RefreshCw className={cn("size-4", isLoadingTeams ? "animate-spin" : "")} aria-hidden="true" />
            Refresh
          </button>
        </div>
        <TeamSelectorStatus isLoadingTeams={isLoadingTeams} teamError={teamError} teamCount={teams.length} />
        <div className="grid gap-2">
          {teams.map((team) => {
            const isActive = team.id === activeTeamId;
            const isSelecting = isSelectingTeamId === team.id;
            return (
              <button
                className={cn("grid min-h-20 gap-2 rounded-lg border p-3 text-left shadow-sm shadow-foreground/[0.025] transition hover:-translate-y-0.5 sm:grid-cols-[1fr_auto] sm:items-center", isActive ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--border)] bg-[var(--card)] hover:border-[var(--accent)]")}
                disabled={Boolean(isSelectingTeamId)}
                key={team.id}
                onClick={() => void chooseTeam(team)}
                type="button"
              >
                <span className="grid min-w-0 gap-1">
                  <span className="truncate text-base font-black text-foreground">{team.name}</span>
                  <span className="flex flex-wrap items-center gap-2 text-xs font-bold text-[var(--muted-foreground)]">
                    <span className="inline-flex items-center gap-1">
                      <UsersRound className="size-4 text-[var(--accent)]" aria-hidden="true" />
                      {team.players.length} player{team.players.length === 1 ? "" : "s"}
                    </span>
                    {isActive ? <span>Current team</span> : null}
                  </span>
                </span>
                <span className="btn-base btn-primary min-h-10 px-3 text-xs">
                  {isSelecting ? "Opening" : "Open"}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TeamSelectorStatus({
  isLoadingTeams,
  teamCount,
  teamError,
}: {
  isLoadingTeams: boolean;
  teamCount: number;
  teamError: string | null;
}) {
  if (teamError) return <TeamSelectorMessage tone="danger">{teamError}</TeamSelectorMessage>;
  if (isLoadingTeams) return <TeamSelectorMessage>Loading teams...</TeamSelectorMessage>;
  if (teamCount === 0) return <TeamSelectorMessage>No teams yet. Add your first team above.</TeamSelectorMessage>;
  return null;
}

function TeamSelectorMessage({ children, tone = "muted" }: { children: string; tone?: "danger" | "muted" }) {
  return (
    <div className={cn("rounded-lg border p-3 text-sm font-semibold", tone === "danger" ? "border-[var(--danger)]/25 bg-[var(--danger-soft)] text-[var(--danger)]" : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted-foreground)]")}>
      {children}
    </div>
  );
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}
