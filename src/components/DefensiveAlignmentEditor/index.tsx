"use client";

import { useState } from "react";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import {
  defensivePositions,
  assignPlayerToPosition,
  defensivePositionLabels,
  getAssignedFemaleDefenderCount,
  getDefensiveAlignmentIssues,
  getDefensiveBenchCounts,
  minimumFemaleDefenders,
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
  const alignmentsForBenchStatus = getAlignmentsForBenchStatus(priorAlignments, alignment);
  const benchCounts = getDefensiveBenchCounts(players, alignmentsForBenchStatus);
  const hasRepeatBenchSits = hasRepeatBenchPlayer(benchCounts);
  const benchPlayers = getBenchPlayers(alignment, players);

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

  return (
    <div className="grid min-w-0 gap-3">
      <DefensiveAlignmentStatusCards alignment={alignment} hasRepeatBenchSits={hasRepeatBenchSits} players={players} />
      <ValidationMessage message={validationMessage} />
      <DefensivePositionGrid alignment={alignment} lockedPitcherPlayerId={lockedPitcherPlayerId} players={players} onUpdatePosition={updatePosition} />
      <BenchSummary benchCounts={benchCounts} benchPlayers={benchPlayers} />
    </div>
  );
}

function getAlignmentsForBenchStatus(
  priorAlignments: DefensiveAlignment[],
  alignment: DefensiveAlignment,
) {
  return priorAlignments.some((candidate) => candidate.id === alignment.id)
    ? priorAlignments
    : [...priorAlignments, alignment];
}

function hasRepeatBenchPlayer(benchCounts: Record<string, number>) {
  return Object.values(benchCounts).some((count) => count > 1);
}

function getBenchPlayers(alignment: DefensiveAlignment, players: Player[]) {
  return alignment.benchPlayerIds
    .map((playerId) => players.find((player) => player.id === playerId))
    .filter((player): player is Player => Boolean(player));
}

function DefensiveAlignmentStatusCards({
  alignment,
  hasRepeatBenchSits,
  players,
}: {
  alignment: DefensiveAlignment;
  hasRepeatBenchSits: boolean;
  players: Player[];
}) {
  const femaleDefenderCount = getAssignedFemaleDefenderCount(alignment, players);

  return (
    <div className="grid gap-2 sm:grid-cols-3">
      <PitcherStatusCard alignment={alignment} players={players} />
      <FemaleDefenderStatusCard femaleDefenderCount={femaleDefenderCount} />
      <BenchRotationStatusCard hasRepeatBenchSits={hasRepeatBenchSits} />
    </div>
  );
}

function PitcherStatusCard({
  alignment,
  players,
}: {
  alignment: DefensiveAlignment;
  players: Player[];
}) {
  return (
    <div className="rounded-lg bg-[var(--surface)] px-3 py-2 text-sm font-bold text-foreground">
      <span className="flex items-center gap-1.5">
        <LockKeyhole className="size-3.5 text-[var(--accent)]" aria-hidden="true" />
        Pitcher: {getPitcherName(alignment, players)}
      </span>
      <span className="mt-0.5 block text-xs font-semibold text-[var(--muted-foreground)]">
        Stays all game
      </span>
    </div>
  );
}

function FemaleDefenderStatusCard({ femaleDefenderCount }: { femaleDefenderCount: number }) {
  return (
    <div className={cn("rounded-lg px-3 py-2 text-sm font-bold", getFemaleDefenderToneClass(femaleDefenderCount))}>
      {femaleDefenderCount} female defenders
      <span className="mt-0.5 block text-xs font-semibold">
        Minimum {minimumFemaleDefenders}
      </span>
    </div>
  );
}

function getFemaleDefenderToneClass(femaleDefenderCount: number) {
  return femaleDefenderCount >= minimumFemaleDefenders
    ? "bg-[var(--success-soft)] text-[var(--success)]"
    : "bg-[var(--danger-soft)] text-[var(--danger)]";
}

function BenchRotationStatusCard({ hasRepeatBenchSits }: { hasRepeatBenchSits: boolean }) {
  return (
    <div className="rounded-lg bg-[var(--surface)] px-3 py-2 text-sm font-bold text-foreground">
      Bench rotation
      <span className="mt-0.5 block text-xs font-semibold text-[var(--muted-foreground)]">
        {hasRepeatBenchSits ? "Repeat sit detected" : "No repeat sits"}
      </span>
    </div>
  );
}

function ValidationMessage({ message }: { message: string }) {
  if (!message) {
    return null;
  }

  return (
    <p className="rounded-lg bg-[var(--danger-soft)] px-3 py-2 text-sm font-bold text-[var(--danger)]" role="alert">
      {message}
    </p>
  );
}

function DefensivePositionGrid({
  alignment,
  lockedPitcherPlayerId,
  players,
  onUpdatePosition,
}: {
  alignment: DefensiveAlignment;
  lockedPitcherPlayerId?: string | null;
  players: Player[];
  onUpdatePosition: (position: DefensivePosition, playerId: string) => void;
}) {
  return (
    <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      {defensivePositions.map((position) => (
        <DefensivePositionField
          alignment={alignment}
          key={position}
          lockedPitcherPlayerId={lockedPitcherPlayerId}
          players={players}
          position={position}
          onUpdatePosition={onUpdatePosition}
        />
      ))}
    </div>
  );
}

function DefensivePositionField({
  alignment,
  lockedPitcherPlayerId,
  players,
  position,
  onUpdatePosition,
}: {
  alignment: DefensiveAlignment;
  lockedPitcherPlayerId?: string | null;
  players: Player[];
  position: DefensivePosition;
  onUpdatePosition: (position: DefensivePosition, playerId: string) => void;
}) {
  return (
    <label className="grid min-w-0 gap-1 rounded-lg border border-[var(--border)] bg-[var(--card)] p-2 text-xs font-bold text-[var(--muted-foreground)]">
      <span className="flex items-center gap-1 text-foreground">
        <ShieldCheck className="size-3.5 text-[var(--accent)]" aria-hidden="true" />
        {position}
      </span>
      <select
        className={selectClass}
        disabled={isLockedPitcherPosition(position, lockedPitcherPlayerId)}
        onChange={(event) => onUpdatePosition(position, event.target.value)}
        value={getSelectedPositionValue(alignment, position)}
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
}

function isLockedPitcherPosition(position: DefensivePosition, lockedPitcherPlayerId?: string | null) {
  return position === "P" && Boolean(lockedPitcherPlayerId);
}

function getSelectedPositionValue(alignment: DefensiveAlignment, position: DefensivePosition) {
  const slot = alignment.slots[position];
  return slot?.status === "ASSIGNED" ? slot.playerId : "VACANT";
}

function BenchSummary({
  benchCounts,
  benchPlayers,
}: {
  benchCounts: Record<string, number>;
  benchPlayers: Player[];
}) {
  return (
    <div className="grid gap-2 rounded-lg bg-[var(--surface)] p-3">
      <div className="min-w-0">
        <p className="text-sm font-bold text-foreground">Bench</p>
        <p className="mt-1 text-sm font-semibold text-[var(--muted-foreground)]">
          {formatBenchSummary(benchPlayers, benchCounts)}
        </p>
      </div>
    </div>
  );
}

function formatBenchSummary(benchPlayers: Player[], benchCounts: Record<string, number>) {
  return benchPlayers.length
    ? benchPlayers.map((player) => formatBenchPlayer(player, benchCounts)).join(", ")
    : "No bench players";
}

function formatBenchPlayer(player: Player, benchCounts: Record<string, number>) {
  const sitCount = benchCounts[player.id] ?? 0;
  return `${player.name.split(" ")[0]} (${sitCount} sit${sitCount === 1 ? "" : "s"})`;
}

function getPitcherName(alignment: DefensiveAlignment, players: Player[]) {
  const pitcherSlot = alignment.slots.P;

  if (!isAssignedPitcherSlot(pitcherSlot)) {
    return "Not assigned";
  }

  return getAssignedPitcherName(pitcherSlot, players);
}

function isAssignedPitcherSlot(
  slot: DefensiveAlignment["slots"]["P"],
): slot is Extract<NonNullable<DefensiveAlignment["slots"]["P"]>, { status: "ASSIGNED" }> {
  return slot?.status === "ASSIGNED";
}

function getAssignedPitcherName(
  pitcherSlot: Extract<NonNullable<DefensiveAlignment["slots"]["P"]>, { status: "ASSIGNED" }>,
  players: Player[],
) {
  const player = players.find((candidate) => candidate.id === pitcherSlot.playerId);
  return player?.name ?? pitcherSlot.playerName;
}
