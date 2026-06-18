"use client";

import { useState } from "react";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import {
  allDefensivePositions,
  assignPlayerToPosition,
  defensivePositionLabels,
  getAssignedFemaleDefenderCount,
  getDefensiveAlignmentIssues,
  getDefensiveBenchCounts,
  minimumFemaleDefenders,
  requiredDefensivePositions,
} from "@/lib/defenseEngine";
import { cn } from "@/lib/utils";
import type { DefensiveAlignment, DefensivePosition } from "@/types/defense";
import type { Player } from "@/types/player";

type DefensiveAlignmentEditorProps = {
  alignment: DefensiveAlignment;
  players: Player[];
  priorAlignments?: DefensiveAlignment[];
  lockedPitcherPlayerId?: string | null;
  onChange: (alignment: DefensiveAlignment) => void;
};

const selectClass = "min-h-11 w-full min-w-0 max-w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm font-bold text-foreground outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]";

export function DefensiveAlignmentEditor({
  alignment,
  players,
  priorAlignments = [],
  lockedPitcherPlayerId,
  onChange,
}: DefensiveAlignmentEditorProps) {
  const [validationMessage, setValidationMessage] = useState("");
  const visiblePositions = alignment.roverEnabled ? allDefensivePositions : requiredDefensivePositions;
  const alignmentsForBenchStatus = priorAlignments.some((candidate) => candidate.id === alignment.id)
    ? priorAlignments
    : [...priorAlignments, alignment];
  const benchCounts = getDefensiveBenchCounts(players, alignmentsForBenchStatus);
  const hasRepeatBenchSits = Object.values(benchCounts).some((count) => count > 1);
  const benchPlayers = alignment.benchPlayerIds
    .map((playerId) => players.find((player) => player.id === playerId))
    .filter((player): player is Player => Boolean(player));

  function updatePosition(position: DefensivePosition, playerId: string) {
    const nextAlignment = assignPlayerToPosition(alignment, players, position, playerId);
    const issues = getDefensiveAlignmentIssues(nextAlignment, players, lockedPitcherPlayerId);

    if (issues.length > 0) {
      setValidationMessage(issues[0].message);
      return;
    }

    setValidationMessage("");
    onChange(nextAlignment);
  }

  function enableRover() {
    onChange({
      ...alignment,
      roverEnabled: true,
      slots: {
        ...alignment.slots,
        ROVER: alignment.slots.ROVER ?? { status: "VACANT" },
      },
    });
  }

  function disableRover() {
    updatePosition("ROVER", "DISABLED_ROVER");
  }

  return (
    <div className="grid min-w-0 gap-3">
      <div className="grid gap-2 sm:grid-cols-3">
        <div className="rounded-lg bg-[var(--surface)] px-3 py-2 text-sm font-bold text-foreground">
          <span className="flex items-center gap-1.5">
            <LockKeyhole className="size-3.5 text-[var(--accent)]" aria-hidden="true" />
            Pitcher: {getPitcherName(alignment, players)}
          </span>
          <span className="mt-0.5 block text-xs font-semibold text-[var(--muted-foreground)]">
            Stays all game
          </span>
        </div>
        <div className={cn(
          "rounded-lg px-3 py-2 text-sm font-bold",
          getAssignedFemaleDefenderCount(alignment, players) >= minimumFemaleDefenders
            ? "bg-[var(--success-soft)] text-[var(--success)]"
            : "bg-[var(--danger-soft)] text-[var(--danger)]",
        )}>
          {getAssignedFemaleDefenderCount(alignment, players)} female defenders
          <span className="mt-0.5 block text-xs font-semibold">
            Minimum {minimumFemaleDefenders}
          </span>
        </div>
        <div className="rounded-lg bg-[var(--surface)] px-3 py-2 text-sm font-bold text-foreground">
          Bench rotation
          <span className="mt-0.5 block text-xs font-semibold text-[var(--muted-foreground)]">
            {hasRepeatBenchSits ? "Repeat sit detected" : "No repeat sits"}
          </span>
        </div>
      </div>

      {validationMessage ? (
        <p className="rounded-lg bg-[var(--danger-soft)] px-3 py-2 text-sm font-bold text-[var(--danger)]" role="alert">
          {validationMessage}
        </p>
      ) : null}

      <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {visiblePositions.map((position) => {
          const slot = alignment.slots[position];
          const selectedValue = slot?.status === "ASSIGNED" ? slot.playerId : "VACANT";

          return (
            <label
              className="grid min-w-0 gap-1 rounded-lg border border-[var(--border)] bg-[var(--card)] p-2 text-xs font-bold text-[var(--muted-foreground)]"
              key={position}
            >
              <span className="flex items-center gap-1 text-foreground">
                <ShieldCheck className="size-3.5 text-[var(--accent)]" aria-hidden="true" />
                {position}
              </span>
              <select
                className={selectClass}
                disabled={position === "P" && Boolean(lockedPitcherPlayerId)}
                onChange={(event) => updatePosition(position, event.target.value)}
                value={selectedValue}
              >
                <option value="VACANT">Vacant</option>
                {players.map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.name}
                  </option>
                ))}
              </select>
              <span className="truncate text-[0.68rem] leading-4">
                {defensivePositionLabels[position]}
              </span>
            </label>
          );
        })}
      </div>

      <div className="grid gap-2 rounded-lg bg-[var(--surface)] p-3 sm:grid-cols-[1fr_auto] sm:items-center">
        <div className="min-w-0">
          <p className="text-sm font-bold text-foreground">Bench</p>
          <p className="mt-1 text-sm font-semibold text-[var(--muted-foreground)]">
            {benchPlayers.length ? (
              benchPlayers.map((player) => `${player.name.split(" ")[0]} (${benchCounts[player.id] ?? 0} sit${benchCounts[player.id] === 1 ? "" : "s"})`).join(", ")
            ) : "No bench players"}
          </p>
        </div>
        <button
          className={cn(
            "min-h-10 rounded-lg px-3 text-sm font-bold",
            alignment.roverEnabled
              ? "bg-[var(--danger-soft)] text-[var(--danger)]"
              : "bg-[var(--success-soft)] text-[var(--success)]",
          )}
          onClick={alignment.roverEnabled ? disableRover : enableRover}
          type="button"
        >
          {alignment.roverEnabled ? "Disable Rover" : "Enable Rover"}
        </button>
      </div>
    </div>
  );
}

function getPitcherName(alignment: DefensiveAlignment, players: Player[]) {
  const pitcherSlot = alignment.slots.P;

  if (pitcherSlot?.status !== "ASSIGNED") {
    return "Not assigned";
  }

  return players.find((player) => player.id === pitcherSlot.playerId)?.name ?? pitcherSlot.playerName;
}
