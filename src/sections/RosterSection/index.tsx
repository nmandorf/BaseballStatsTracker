"use client";

import { useMemo, useState } from "react";
import { ClipboardList, Filter, RotateCcw, Search, UserPlus, UserRound, X } from "lucide-react";
import { PlayerCard } from "@/components/PlayerCard";
import { PlayerForm } from "@/components/PlayerForm";
import { StatTile } from "@/components/StatTile";
import { TeamSetupGate } from "@/components/TeamSetupGate";
import { resetFirstGameState } from "@/lib/firstGameStorage";
import { getPlayerSeasonStats } from "@/lib/gameEngine";
import { calculateStats, formatPercent, formatRate } from "@/lib/statCalculations";
import {
  addPlayerToActiveTeamBackend,
  resetActiveTeam,
  updateActiveTeamPlayers,
  useActiveTeam,
} from "@/lib/teamStorage";
import { useFirstGameState } from "@/lib/useFirstGameState";
import { cn } from "@/lib/utils";
import type { Player, PlayerGender } from "@/types/player";

export function RosterSection() {
  const activeTeam = useActiveTeam();
  const firstGameState = useFirstGameState();
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");
  const [isSavingPlayer, setIsSavingPlayer] = useState(false);

  const playersWithStats = useMemo(() => {
    if (!activeTeam) {
      return [];
    }

    return activeTeam.players.map((player) => ({
      ...player,
      seasonStats: getPlayerSeasonStats(player, firstGameState),
    }));
  }, [activeTeam, firstGameState]);

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

  function clearTeam() {
    resetFirstGameState();
    resetActiveTeam();
  }

  function resetTeam() {
    resetFirstGameState();
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
                    "inline-flex min-h-10 min-w-0 items-center justify-center rounded-full border px-3 text-center text-xs font-bold",
                    filter === item
                      ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                      : "border-[var(--border)] bg-[var(--surface)] text-foreground",
                  )}
                  key={item}
                  onClick={() => setFilter(item)}
                  type="button"
                >
                  {item[0].toUpperCase() + item.slice(1)}
                </button>
              ))}
              <button
                className="inline-flex min-h-10 min-w-0 items-center justify-center gap-2 rounded-full border border-[var(--accent)] bg-[var(--accent)] px-3 text-center text-xs font-bold leading-tight text-white"
                onClick={() => setShowAddPlayer(true)}
                type="button"
              >
                <UserPlus className="size-4" aria-hidden="true" />
                Add Player
              </button>
              <button
                className="inline-flex min-h-10 min-w-0 items-center justify-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 text-center text-xs font-bold leading-tight text-foreground"
                onClick={resetTeam}
                type="button"
              >
                <RotateCcw className="size-4" aria-hidden="true" />
                Reset Game
              </button>
              <button
                className="inline-flex min-h-10 min-w-0 items-center justify-center gap-2 rounded-full border border-[var(--danger)]/25 bg-[var(--danger-soft)] px-3 text-center text-xs font-bold leading-tight text-[var(--danger)]"
                onClick={clearTeam}
                type="button"
              >
                Clear Team
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 grid items-stretch gap-3 lg:grid-cols-3">
          {filteredPlayers.map((player) => (
            <div className="grid h-full grid-rows-[1fr_auto_auto] gap-2" key={player.id}>
              <PlayerCard
                bats={player.bats}
                gender={player.gender}
                name={player.name}
                note={player.notes}
                role={player.roleHint}
                speed={player.speedRating}
                stats={buildPlayerStats(player)}
                status={player.isActive ? "Active" : "Inactive"}
              />
              <button
                className={cn(
                  "min-h-11 rounded-lg text-sm font-bold",
                  player.isActive
                    ? "bg-[var(--danger-soft)] text-[var(--danger)]"
                    : "bg-[var(--success-soft)] text-[var(--success)]",
                )}
                onClick={() => togglePlayer(player.id)}
                type="button"
              >
                {player.isActive ? "Mark Inactive" : "Mark Active"}
              </button>
              <div className="grid grid-cols-2 gap-2">
                {(["Female", "Male"] as const).map((gender) => (
                  <button
                    className={cn(
                      "min-h-10 rounded-lg border px-3 text-xs font-bold",
                      player.gender === gender
                        ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                        : "border-[var(--border)] bg-[var(--surface)] text-foreground",
                    )}
                    key={gender}
                    onClick={() => setPlayerGender(player.id, gender)}
                    type="button"
                  >
                    {gender}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

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
                className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[var(--surface)] text-foreground"
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
