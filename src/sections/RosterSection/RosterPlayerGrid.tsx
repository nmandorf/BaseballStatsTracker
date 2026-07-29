import { PencilLine } from "lucide-react";
import { PlayerCard } from "@/components/PlayerCard";
import { getDefensivePositionOptions } from "@/lib/defensivePositions";
import { useFirstGameState } from "@/lib/useFirstGameState";
import { cn } from "@/lib/utils";
import type { Player, PlayerGender } from "@/types/player";
import { buildPlayerDefense, buildPlayerStats } from "./rosterDecisions";

type FirstGameState = ReturnType<typeof useFirstGameState>;

export function RosterPlayerGrid({
  firstGameState,
  players,
  onEditStats,
  onSetGender,
  onSetPosition,
  onToggleActive,
}: {
  firstGameState: FirstGameState;
  players: Player[];
  onEditStats: (playerId: string) => void;
  onSetGender: (playerId: string, gender: PlayerGender) => void;
  onSetPosition: (playerId: string, primaryPosition: string) => void;
  onToggleActive: (playerId: string) => void;
}) {
  return (
    <div className="mt-4 grid items-stretch gap-3 lg:grid-cols-3">
      {players.map((player) => (
        <RosterPlayerItem
          firstGameState={firstGameState}
          key={player.id}
          player={player}
          onEditStats={onEditStats}
          onSetGender={onSetGender}
          onSetPosition={onSetPosition}
          onToggleActive={onToggleActive}
        />
      ))}
    </div>
  );
}

function RosterPlayerItem({
  firstGameState,
  player,
  onEditStats,
  onSetGender,
  onSetPosition,
  onToggleActive,
}: {
  firstGameState: FirstGameState;
  player: Player;
  onEditStats: (playerId: string) => void;
  onSetGender: (playerId: string, gender: PlayerGender) => void;
  onSetPosition: (playerId: string, primaryPosition: string) => void;
  onToggleActive: (playerId: string) => void;
}) {
  const playerDefense = buildPlayerDefense(player, firstGameState);

  return (
    <div className="grid h-full grid-rows-[1fr_auto_auto_auto_auto] gap-2">
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
      <PrimaryDefenseSelect player={player} onSetPosition={onSetPosition} />
      <button
        className="btn-base btn-secondary min-h-11 px-3 text-sm"
        onClick={() => onEditStats(player.id)}
        type="button"
      >
        <PencilLine className="size-4" aria-hidden="true" />
        Edit Prior Stats
      </button>
      <RosterActiveToggleButton
        player={player}
        onToggleActive={onToggleActive}
      />
      <RosterGenderButtons player={player} onSetGender={onSetGender} />
    </div>
  );
}

function PrimaryDefenseSelect({
  player,
  onSetPosition,
}: {
  player: Player;
  onSetPosition: (playerId: string, primaryPosition: string) => void;
}) {
  return (
    <label className="grid gap-1 text-xs font-bold text-[var(--muted-foreground)]">
      Primary defense
      <select
        aria-label={`${player.name} primary defense`}
        className="min-h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-bold text-foreground outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
        onChange={(event) => onSetPosition(player.id, event.target.value)}
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
  );
}

function RosterActiveToggleButton({
  player,
  onToggleActive,
}: {
  player: Player;
  onToggleActive: (playerId: string) => void;
}) {
  return (
    <button
      className={cn(
        "btn-base min-h-11 text-sm",
        player.isActive ? "btn-danger-secondary" : "btn-secondary",
      )}
      aria-pressed={player.isActive}
      onClick={() => onToggleActive(player.id)}
      type="button"
    >
      {player.isActive ? "Mark Inactive" : "Mark Active"}
    </button>
  );
}

function RosterGenderButtons({
  player,
  onSetGender,
}: {
  player: Player;
  onSetGender: (playerId: string, gender: PlayerGender) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {(["Female", "Male"] as const).map((gender) => (
        <RosterGenderButton
          active={player.gender === gender}
          gender={gender}
          key={gender}
          onClick={() => onSetGender(player.id, gender)}
        />
      ))}
    </div>
  );
}

function RosterGenderButton({
  active,
  gender,
  onClick,
}: {
  active: boolean;
  gender: Exclude<PlayerGender, "Unknown">;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "btn-base min-h-10 px-3 text-xs",
        active ? "btn-choice-selected" : "btn-choice",
      )}
      aria-pressed={active}
      onClick={onClick}
      type="button"
    >
      {gender}
    </button>
  );
}
