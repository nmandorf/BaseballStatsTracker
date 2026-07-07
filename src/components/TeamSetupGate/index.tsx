import { useState } from "react";
import { Check } from "lucide-react";
import { PlayerForm } from "@/components/PlayerForm";
import { ScheduleEditor } from "@/components/ScheduleEditor";
import { createInitialGameState } from "@/lib/gameEngine";
import { saveFirstGameState } from "@/lib/firstGameStorage";
import { createDefaultPregameSetup, savePregameSetup } from "@/lib/pregameSetupStorage";
import {
  addPlayerToBackendTeam,
  createActiveTeam,
  createBackendTeam,
  saveActiveTeam,
  syncActiveTeamToBackend,
} from "@/lib/teamStorage";
import type { ActiveTeam, Player, PlayerProfileInput } from "@/types/player";

type TeamSetupGateProps = {
  title?: string;
};

export function TeamSetupGate({
  title = "Create your team first.",
}: TeamSetupGateProps) {
  const [teamName, setTeamName] = useState("");
  const [pendingTeam, setPendingTeam] = useState<ActiveTeam | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [isSavingTeam, setIsSavingTeam] = useState(false);
  const [isSavingPlayer, setIsSavingPlayer] = useState(false);
  const [isAddingSchedule, setIsAddingSchedule] = useState(false);

  const canCreateTeam = canCreatePendingTeam(teamName);
  const confirmedTeamName = pendingTeam?.name ?? "";
  const canFinish = Boolean(confirmedTeamName && players.length);

  async function confirmTeam() {
    if (!canCreateTeam || isSavingTeam) {
      return;
    }

    setIsSavingTeam(true);

    const team = await createBackendTeam(teamName);

    setPendingTeam(team);
    setPlayers(team.players);
    setIsSavingTeam(false);
  }

  async function addPlayer(input: PlayerProfileInput) {
    if (!pendingTeam || isSavingPlayer) {
      return;
    }

    setIsSavingPlayer(true);

    const nextTeam = await addPlayerToBackendTeam(pendingTeam, input, players.length + 1);

    setPendingTeam(nextTeam);
    setPlayers(nextTeam.players);
    setIsSavingPlayer(false);
  }

  function finishSetup(timeZone: string | null) {
    if (!canFinish) {
      return;
    }

    const team = getFinishedSetupTeam(pendingTeam, confirmedTeamName, players, timeZone);

    saveActiveTeam({ ...team, timeZone, scheduleSetupCompleted: true });
    syncActiveTeamToBackend(team);
    savePregameSetup(createDefaultPregameSetup(team));
    saveFirstGameState(createInitialGameState(team.players));
  }

  return (
    <section className="bg-background py-6 sm:py-8">
      <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <TeamNameCard
            canCreateTeam={canCreateTeam}
            confirmedTeamName={confirmedTeamName}
            isSavingTeam={isSavingTeam}
            onConfirmTeam={confirmTeam}
            onTeamNameChange={setTeamName}
            teamName={teamName}
            title={title}
          />

          <InitialRosterCard players={players} />
        </div>

        <InitialPlayerForm
          confirmedTeamName={confirmedTeamName}
          isAddingSchedule={isAddingSchedule}
          isSavingPlayer={isSavingPlayer}
          onAddPlayer={addPlayer}
          players={players}
        />

        <ContinueToScheduleCard canFinish={canFinish} isAddingSchedule={isAddingSchedule} onContinue={() => setIsAddingSchedule(true)} />

        <ScheduleSetupStep isAddingSchedule={isAddingSchedule} onFinishSetup={finishSetup} pendingTeam={pendingTeam} />
      </div>
    </section>
  );
}

function TeamNameCard({
  canCreateTeam,
  confirmedTeamName,
  isSavingTeam,
  onConfirmTeam,
  onTeamNameChange,
  teamName,
  title,
}: {
  canCreateTeam: boolean;
  confirmedTeamName: string;
  isSavingTeam: boolean;
  onConfirmTeam: () => void;
  onTeamNameChange: (teamName: string) => void;
  teamName: string;
  title: string;
}) {
  return (
    <article className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm shadow-foreground/[0.035]">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
        Team
      </p>
      <h2 className="mt-1 text-lg font-semibold text-foreground">
        {title}
      </h2>
      <p className="mt-2 text-sm font-medium leading-6 text-[var(--muted-foreground)]">
        Add the team name first, then add at least one player to open the app.
      </p>
      <div className="mt-4 grid gap-3">
        <label className="grid gap-1 text-sm font-bold text-foreground">
          Team name
          <input
            className="min-h-11 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 font-semibold outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
            disabled={Boolean(confirmedTeamName)}
            onChange={(event) => onTeamNameChange(event.target.value)}
            placeholder="Team name"
            value={teamName}
          />
        </label>
        <button
          className="btn-base btn-primary min-h-11 px-3 text-sm"
          disabled={!canCreateTeam || Boolean(confirmedTeamName) || isSavingTeam}
          onClick={onConfirmTeam}
          type="button"
        >
          {getCreateTeamButtonLabel(isSavingTeam, confirmedTeamName)}
        </button>
      </div>
    </article>
  );
}

function InitialRosterCard({ players }: { players: Player[] }) {
  return (
    <article className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm shadow-foreground/[0.035]">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
        Initial roster
      </p>
      <h2 className="mt-1 text-lg font-semibold text-foreground">
        {getRosterTitle(players.length)}
      </h2>
      <div className="mt-4 grid gap-2">
        {players.map((player) => (
          <InitialRosterPlayer key={player.id} player={player} />
        ))}
      </div>
    </article>
  );
}

function InitialRosterPlayer({ player }: { player: Player }) {
  return (
    <div className="rounded-lg bg-[var(--surface)] px-3 py-2 text-sm font-semibold text-foreground">
      {player.seedOrder}. {player.name} - {player.gender} - {player.speedRating} - {player.roleHint}
    </div>
  );
}

function InitialPlayerForm({
  confirmedTeamName,
  isAddingSchedule,
  isSavingPlayer,
  onAddPlayer,
  players,
}: {
  confirmedTeamName: string;
  isAddingSchedule: boolean;
  isSavingPlayer: boolean;
  onAddPlayer: (input: PlayerProfileInput) => void;
  players: Player[];
}) {
  if (!confirmedTeamName || isAddingSchedule) {
    return null;
  }

  return (
    <div className="mt-4">
      <PlayerForm
        seedOrder={players.length + 1}
        submitLabel={getPlayerSubmitLabel(isSavingPlayer, players.length)}
        submitVariant={players.length ? "secondary" : "primary"}
        onSubmit={onAddPlayer}
      />
    </div>
  );
}

function ContinueToScheduleCard({
  canFinish,
  isAddingSchedule,
  onContinue,
}: {
  canFinish: boolean;
  isAddingSchedule: boolean;
  onContinue: () => void;
}) {
  if (isAddingSchedule) {
    return null;
  }

  return (
    <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--card)] p-3 shadow-sm shadow-foreground/[0.035]">
      <button className="btn-base btn-primary min-h-12 w-full px-4 text-sm" disabled={!canFinish} onClick={onContinue} type="button">
        <Check className="size-4" aria-hidden="true" />
        Continue to Schedule
      </button>
    </div>
  );
}

function ScheduleSetupStep({
  isAddingSchedule,
  onFinishSetup,
  pendingTeam,
}: {
  isAddingSchedule: boolean;
  onFinishSetup: (timeZone: string | null) => void;
  pendingTeam: ActiveTeam | null;
}) {
  if (!isAddingSchedule || !pendingTeam) {
    return null;
  }

  return (
    <div className="mt-4">
      <div className="mb-3 rounded-lg bg-[var(--accent-soft)] p-4">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--accent)]">Final setup step</p>
        <h2 className="mt-1 text-lg font-semibold text-foreground">Add games and bye weeks</h2>
      </div>
      <ScheduleEditor teamId={pendingTeam.id} onSaved={(schedule) => onFinishSetup(schedule.timeZone)} />
    </div>
  );
}

function canCreatePendingTeam(teamName: string) {
  return Boolean(teamName.trim());
}

function getFinishedSetupTeam(
  pendingTeam: ActiveTeam | null,
  confirmedTeamName: string,
  players: Player[],
  timeZone: string | null,
) {
  return pendingTeam
    ? getFinishedPendingTeam(pendingTeam, players, timeZone)
    : createActiveTeam(confirmedTeamName, players);
}

function getFinishedPendingTeam(pendingTeam: ActiveTeam, players: Player[], timeZone: string | null) {
  return {
    ...pendingTeam,
    timeZone,
    scheduleSetupCompleted: true,
    players: players.map((player, index) => ({ ...player, seedOrder: index + 1 })),
    updatedAt: new Date().toISOString(),
  };
}

function getCreateTeamButtonLabel(isSavingTeam: boolean, confirmedTeamName: string) {
  if (isSavingTeam) {
    return "Creating...";
  }

  return confirmedTeamName ? "Team Created" : "Create Team";
}

function getRosterTitle(playerCount: number) {
  if (!playerCount) {
    return "Add at least one player";
  }

  return `${playerCount} player${playerCount === 1 ? "" : "s"} added`;
}

function getPlayerSubmitLabel(isSavingPlayer: boolean, playerCount: number) {
  if (isSavingPlayer) {
    return "Saving Player...";
  }

  return playerCount ? "Add Another Player" : "Add Player";
}
