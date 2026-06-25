"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ClipboardList, Filter, PencilLine, RotateCcw, Search, UserPlus, UserRound, X } from "lucide-react";
import { PlayerCard } from "@/components/PlayerCard";
import { PlayerForm } from "@/components/PlayerForm";
import { PriorStatsEditor } from "@/components/PriorStatsEditor";
import { StatTile } from "@/components/StatTile";
import { TeamSetupGate } from "@/components/TeamSetupGate";
import { getDefensivePositionOptions } from "@/lib/defensivePositions";
import { resetFirstGameState, saveFirstGameState } from "@/lib/firstGameStorage";
import { getDefensiveSummary } from "@/lib/defenseEngine";
import { getPlayerGameStats, getPlayerSeasonStats, updatePlayerSeasonStatsBaseline } from "@/lib/gameEngine";
import { calculateStats, formatPercent, formatRate } from "@/lib/statCalculations";
import {
  addPlayerToActiveTeamBackend,
  deleteTeamPermanently,
  resetActiveTeam,
  updateActiveTeamPlayers,
  useActiveTeam,
} from "@/lib/teamStorage";
import { useFirstGameState } from "@/lib/useFirstGameState";
import { cn } from "@/lib/utils";
import type { Player, PlayerGender } from "@/types/player";
import type { PlayerStats } from "@/types/stats";

export function RosterSection() {
  const activeTeam = useActiveTeam();
  const firstGameState = useFirstGameState();
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");
  const [isSavingPlayer, setIsSavingPlayer] = useState(false);
  const [editingStatsPlayerId, setEditingStatsPlayerId] = useState<string | null>(null);
  const [showClearTeamConfirmation, setShowClearTeamConfirmation] = useState(false);
  const [isDeletingTeam, setIsDeletingTeam] = useState(false);
  const [teamDeletionError, setTeamDeletionError] = useState<string | null>(null);
  const clearTeamDialogRef = useRef<HTMLDivElement>(null);
  const cancelDeleteTeamButtonRef = useRef<HTMLButtonElement>(null);
  const deleteTeamTriggerRef = useRef<HTMLButtonElement>(null);

  const playersWithStats = useMemo(() => {
    if (!activeTeam) {
      return [];
    }

    return activeTeam.players.map((player) => ({
      ...player,
      seasonStats: player.seasonStats,
    }));
  }, [activeTeam]);

  const players = useMemo(
    () => playersWithStats,
    [playersWithStats],
  );

  const filteredPlayers = useMemo(
    () =>
      players.filter((player) => {
        const matchesQuery = player.name.toLowerCase().includes(query.toLowerCase());
        const matchesFilter =
          filter === "all" ||
          (filter === "active" && player.isActive) ||
          (filter === "inactive" && !player.isActive);

        return matchesQuery && matchesFilter;
      }),
    [filter, players, query],
  );

  const activeCount = players.filter((player) => player.isActive).length;
  const editingStatsPlayer = activeTeam?.players.find((player) => player.id === editingStatsPlayerId) ?? null;
  const editingStatsBaseline = editingStatsPlayer
    ? firstGameState.lineup.find((player) => player.id === editingStatsPlayer.id)?.seasonStats ?? editingStatsPlayer.seasonStats
    : null;

  useEffect(() => {
    if (!showClearTeamConfirmation) {
      return;
    }

    const triggerElement = deleteTeamTriggerRef.current;

    cancelDeleteTeamButtonRef.current?.focus();

    function handleDialogKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isDeletingTeam) {
        setShowClearTeamConfirmation(false);
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusableElements = clearTeamDialogRef.current?.querySelectorAll<HTMLElement>(
        "button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex='-1'])",
      );

      if (!focusableElements?.length) {
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }

      if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    document.addEventListener("keydown", handleDialogKeyDown);

    return () => {
      document.removeEventListener("keydown", handleDialogKeyDown);
      triggerElement?.focus();
    };
  }, [isDeletingTeam, showClearTeamConfirmation]);

  if (!activeTeam) {
    return <TeamSetupGate title="Create your team before building the roster." />;
  }

  function togglePlayer(playerId: string) {
    if (!activeTeam) {
      return;
    }

    updateActiveTeamPlayers(
      activeTeam.players.map((player) => ({
        ...player,
        isActive: player.id === playerId ? !player.isActive : player.isActive,
      })),
    );
  }

  function setPlayerGender(playerId: string, gender: PlayerGender) {
    if (!activeTeam || gender === "Unknown") {
      return;
    }

    updateActiveTeamPlayers(
      activeTeam.players.map((player) => ({
        ...player,
        gender: player.id === playerId ? gender : player.gender,
      })),
    );
  }

  function setPlayerPosition(playerId: string, primaryPosition: string) {
    if (!activeTeam) {
      return;
    }

    updateActiveTeamPlayers(
      activeTeam.players.map((player) => ({
        ...player,
        primaryPosition: player.id === playerId ? primaryPosition : player.primaryPosition,
      })),
    );
  }

  async function clearTeam() {
    if (!activeTeam || isDeletingTeam) {
      return;
    }

    setIsDeletingTeam(true);
    setTeamDeletionError(null);

    try {
      await deleteTeamPermanently(activeTeam.id);
      resetFirstGameState();
      resetActiveTeam();
      setShowClearTeamConfirmation(false);
    } catch (error) {
      setTeamDeletionError(
        error instanceof Error
          ? error.message
          : "Unable to delete the team. Please try again.",
      );
    } finally {
      setIsDeletingTeam(false);
    }
  }

  function resetTeam() {
    if (!window.confirm("Reset the current game progress? The roster will stay unchanged.")) {
      return;
    }

    resetFirstGameState();
  }

  function savePriorStats(playerId: string, seasonStats: PlayerStats) {
    if (!activeTeam) {
      return;
    }

    const nextGameState = updatePlayerSeasonStatsBaseline(firstGameState, playerId, seasonStats);
    const player = activeTeam.players.find((item) => item.id === playerId);
    const persistedSeasonStats = player && nextGameState !== firstGameState
      ? getPlayerSeasonStats({ ...player, seasonStats }, nextGameState)
      : seasonStats;

    updateActiveTeamPlayers(
      activeTeam.players.map((item) => (
        item.id === playerId ? { ...item, seasonStats: persistedSeasonStats } : item
      )),
    );

    if (nextGameState !== firstGameState) {
      saveFirstGameState(nextGameState);
    }

    setEditingStatsPlayerId(null);
  }

  return (
    <section className="bg-background py-6 sm:py-8">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-3 sm:grid-cols-3">
          <StatTile helper="On this team" icon={UserRound} label="Players" value={String(players.length)} />
          <StatTile helper="Available for games" icon={ClipboardList} label="Active" tone="success" value={String(activeCount)} />
          <StatTile helper={filter === "all" ? "Showing all" : `Showing ${filter}`} icon={Filter} label="Visible" tone="accent" value={String(filteredPlayers.length)} />
        </div>

        <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--card)] p-3 shadow-sm shadow-foreground/[0.035]">
          <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
            <label className="flex min-h-11 items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm font-semibold text-[var(--muted-foreground)]">
              <Search className="size-4" aria-hidden="true" />
              <input
                className="w-full bg-transparent text-foreground outline-none placeholder:text-[var(--muted-foreground)]"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search players"
                value={query}
              />
            </label>
            <div className="grid min-w-0 grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              {(["all", "active", "inactive"] as const).map((item) => (
                <button
                  className={cn(
                    "btn-base min-h-10 min-w-0 rounded-full px-3 text-center text-xs",
                    filter === item
                      ? "btn-choice-selected"
                      : "btn-choice",
                  )}
                  aria-pressed={filter === item}
                  key={item}
                  onClick={() => setFilter(item)}
                  type="button"
                >
                  {item[0].toUpperCase() + item.slice(1)}
                </button>
              ))}
              <button
                className="btn-base btn-primary min-h-10 min-w-0 rounded-full px-3 text-xs leading-tight"
                onClick={() => setShowAddPlayer(true)}
                type="button"
              >
                <UserPlus className="size-4" aria-hidden="true" />
                Add Player
              </button>
              <button
                className="btn-base btn-secondary min-h-10 min-w-0 rounded-full px-3 text-xs leading-tight"
                onClick={resetTeam}
                type="button"
              >
                <RotateCcw className="size-4" aria-hidden="true" />
                Reset Game
              </button>
              <button
                className="btn-base btn-danger-secondary min-h-10 min-w-0 rounded-full px-3 text-xs leading-tight"
                onClick={() => {
                  setTeamDeletionError(null);
                  setShowClearTeamConfirmation(true);
                }}
                ref={deleteTeamTriggerRef}
                type="button"
              >
                Clear Team
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 grid items-stretch gap-3 lg:grid-cols-3">
          {filteredPlayers.map((player) => {
            const playerDefense = buildPlayerDefense(player, firstGameState);

            return (
              <div className="grid h-full grid-rows-[1fr_auto_auto_auto_auto] gap-2" key={player.id}>
                <PlayerCard
                  bats={player.bats}
                  defenseEvidence={playerDefense.defenseEvidence}
                  defenseLabel={playerDefense.defenseLabel}
                  defenseNote={playerDefense.defenseNote}
                  defenseStats={playerDefense.defenseStats}
                  gender={player.gender}
                  name={player.name}
                  note={player.notes}
                  position={player.primaryPosition}
                  role={player.roleHint}
                  speed={player.speedRating}
                  stats={buildPlayerStats(player)}
                  status={player.isActive ? "Active" : "Inactive"}
                />
                <label className="grid gap-1 text-xs font-bold text-[var(--muted-foreground)]">
                  Primary defense
                  <select
                    aria-label={`${player.name} primary defense`}
                    className="min-h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-bold text-foreground outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
                    onChange={(event) => setPlayerPosition(player.id, event.target.value)}
                    value={player.primaryPosition}
                  >
                    <option value="">Unassigned</option>
                    {getDefensivePositionOptions(player.primaryPosition).map((position) => (
                      <option key={position.value} value={position.value}>
                        {position.label}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  className="btn-base btn-secondary min-h-11 px-3 text-sm"
                  onClick={() => setEditingStatsPlayerId(player.id)}
                  type="button"
                >
                  <PencilLine className="size-4" aria-hidden="true" />
                  Edit Prior Stats
                </button>
                <button
                  className={cn(
                    "btn-base min-h-11 text-sm",
                    player.isActive
                      ? "btn-danger-secondary"
                      : "btn-secondary",
                    )}
                  aria-pressed={player.isActive}
                  onClick={() => togglePlayer(player.id)}
                  type="button"
                >
                  {player.isActive ? "Mark Inactive" : "Mark Active"}
                </button>
                <div className="grid grid-cols-2 gap-2">
                  {(["Female", "Male"] as const).map((gender) => (
                    <button
                      className={cn(
                        "btn-base min-h-10 px-3 text-xs",
                        player.gender === gender
                          ? "btn-choice-selected"
                          : "btn-choice",
                      )}
                      aria-pressed={player.gender === gender}
                      key={gender}
                      onClick={() => setPlayerGender(player.id, gender)}
                      type="button"
                    >
                      {gender}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showClearTeamConfirmation ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-4 sm:items-center">
          <div
            aria-describedby="clear-team-dialog-description"
            aria-labelledby="clear-team-dialog-title"
            aria-modal="true"
            className="w-full max-w-md rounded-lg border border-[var(--danger)]/25 bg-[var(--card)] p-5 shadow-2xl"
            ref={clearTeamDialogRef}
            role="alertdialog"
          >
            <div className="flex items-start gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[var(--danger-soft)] text-[var(--danger)]">
                <AlertTriangle className="size-5" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground" id="clear-team-dialog-title">
                  Permanently delete {activeTeam.name}?
                </h2>
                <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]" id="clear-team-dialog-description">
                  This deletes the team, roster, games, and stats from the database. This action cannot be undone.
                </p>
              </div>
            </div>

            {teamDeletionError ? (
              <p className="mt-4 rounded-lg bg-[var(--danger-soft)] px-3 py-2 text-sm font-bold text-[var(--danger)]" role="alert">
                {teamDeletionError}
              </p>
            ) : null}

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                className="btn-base btn-secondary min-h-11 px-4 text-sm"
                disabled={isDeletingTeam}
                onClick={() => setShowClearTeamConfirmation(false)}
                ref={cancelDeleteTeamButtonRef}
                type="button"
              >
                Cancel
              </button>
              <button
                className="btn-base btn-danger min-h-11 px-4 text-sm"
                disabled={isDeletingTeam}
                onClick={clearTeam}
                type="button"
              >
                {isDeletingTeam ? "Deleting..." : "Delete Team Permanently"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showAddPlayer ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/35 p-4">
          <div
            aria-labelledby="add-player-dialog-title"
            aria-modal="true"
            className="max-h-[calc(100dvh-2rem)] w-full max-w-[38rem] overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--card)] p-5 shadow-2xl sm:p-4"
            role="dialog"
          >
            <div className="mb-5 flex items-start justify-between gap-3 sm:mb-4">
              <div>
                <p className="text-[0.7rem] font-bold uppercase tracking-[0.14em] text-[var(--muted-foreground)] sm:text-xs">
                  Roster
                </p>
                <h2 className="mt-1 text-2xl font-semibold text-foreground sm:text-xl" id="add-player-dialog-title">
                  Add new player
                </h2>
              </div>
              <button
                aria-label="Close add player dialog"
                className="btn-base btn-secondary size-10 min-h-0 shrink-0 p-0"
                onClick={() => setShowAddPlayer(false)}
                type="button"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>
            <PlayerForm
              seedOrder={activeTeam.players.length + 1}
              submitLabel={isSavingPlayer ? "Saving Player..." : "Save Player"}
              variant="plain"
              onCancel={() => setShowAddPlayer(false)}
              onSubmit={async (input) => {
                setIsSavingPlayer(true);
                try {
                  await addPlayerToActiveTeamBackend(input);
                  setShowAddPlayer(false);
                } finally {
                  setIsSavingPlayer(false);
                }
              }}
            />
          </div>
        </div>
      ) : null}

      {editingStatsPlayer && editingStatsBaseline ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/35 p-4">
          <div
            aria-labelledby="edit-prior-stats-dialog-title"
            aria-modal="true"
            className="max-h-[calc(100dvh-2rem)] w-full max-w-[38rem] overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 shadow-2xl sm:p-5"
            role="dialog"
          >
            <div className="sticky -top-4 z-10 mb-4 flex items-start justify-between gap-3 border-b border-[var(--border)] bg-[var(--card)] py-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                  Roster
                </p>
                <h2 className="mt-1 text-xl font-semibold text-foreground" id="edit-prior-stats-dialog-title">
                  Edit Prior Stats
                </h2>
              </div>
              <button
                aria-label="Close prior stats editor"
                className="btn-base btn-secondary size-11 min-h-0 shrink-0 p-0"
                onClick={() => setEditingStatsPlayerId(null)}
                type="button"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>
            <PriorStatsEditor
              playerName={editingStatsPlayer.name}
              stats={editingStatsBaseline}
              currentGameStats={getPlayerGameStats(firstGameState, editingStatsPlayer.id)}
              onCancel={() => setEditingStatsPlayerId(null)}
              onSave={(seasonStats) => savePriorStats(editingStatsPlayer.id, seasonStats)}
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}

function buildPlayerStats(player: Player) {
  const calculated = calculateStats(player.seasonStats);

  return [
    { label: "PA", value: String(player.seasonStats.plateAppearances) },
    { label: "OBP", value: formatRate(calculated.onBasePercentage) },
    { label: "Out%", value: formatPercent(calculated.outRate) },
  ];
}

function buildPlayerDefense(player: Player, gameState: ReturnType<typeof useFirstGameState>) {
  const summary = getDefensiveSummary(player, gameState.defensiveAlignments, gameState.defensiveEvents);

  return {
    defenseLabel: summary.bestFitLabel,
    defenseEvidence: summary.evidenceLabel,
    defenseNote: [player.defensiveProfile.notes.strengths, player.defensiveProfile.notes.weaknesses]
      .filter(Boolean)
      .join(" | "),
    defenseStats: [
      { label: "Inn", value: String(summary.defensiveInnings) },
      { label: "Pos", value: formatDefensivePositions(summary.inningsByPosition) },
      { label: "Routine", value: String(summary.routinePlaysMade) },
      { label: "Great", value: String(summary.greatPlays) },
      { label: "Mis", value: String(summary.misplays) },
      { label: "XB", value: String(summary.extraBasesAllowed) },
    ],
  };
}

function formatDefensivePositions(inningsByPosition: ReturnType<typeof getDefensiveSummary>["inningsByPosition"]) {
  const positions = Object.entries(inningsByPosition)
    .filter(([, innings]) => Boolean(innings))
    .map(([position]) => position);

  return positions.length ? positions.join("/") : "-";
}
