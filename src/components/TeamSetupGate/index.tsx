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

  const canCreateTeam = Boolean(teamName.trim());
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

    const team = pendingTeam
      ? {
          ...pendingTeam,
          timeZone,
          scheduleSetupCompleted: true,
          players: players.map((player, index) => ({ ...player, seedOrder: index + 1 })),
          updatedAt: new Date().toISOString(),
        }
      : createActiveTeam(confirmedTeamName, players);

    saveActiveTeam({ ...team, timeZone, scheduleSetupCompleted: true });
    syncActiveTeamToBackend(team);
    savePregameSetup(createDefaultPregameSetup(team));
    saveFirstGameState(createInitialGameState(team.players));
  }

  return (
    <section className="bg-background py-6 sm:py-8">
      <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
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
                  onChange={(event) => setTeamName(event.target.value)}
                  placeholder="Team name"
                  value={teamName}
                />
              </label>
              <button
                className="btn-base btn-primary min-h-11 px-3 text-sm"
                disabled={!canCreateTeam || Boolean(confirmedTeamName) || isSavingTeam}
                onClick={confirmTeam}
                type="button"
              >
                {isSavingTeam ? "Creating..." : confirmedTeamName ? "Team Created" : "Create Team"}
              </button>
            </div>
          </article>

          <article className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm shadow-foreground/[0.035]">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
              Initial roster
            </p>
            <h2 className="mt-1 text-lg font-semibold text-foreground">
              {players.length ? `${players.length} player${players.length === 1 ? "" : "s"} added` : "Add at least one player"}
            </h2>
            <div className="mt-4 grid gap-2">
              {players.map((player) => (
                <div className="rounded-lg bg-[var(--surface)] px-3 py-2 text-sm font-semibold text-foreground" key={player.id}>
                  {player.seedOrder}. {player.name} - {player.gender} - {player.speedRating} - {player.roleHint}
                </div>
              ))}
            </div>
          </article>
        </div>

        {confirmedTeamName && !isAddingSchedule ? (
          <div className="mt-4">
            <PlayerForm
              seedOrder={players.length + 1}
              submitLabel={isSavingPlayer ? "Saving Player..." : players.length ? "Add Another Player" : "Add Player"}
              submitVariant={players.length ? "secondary" : "primary"}
              onSubmit={addPlayer}
            />
          </div>
        ) : null}

        {!isAddingSchedule ? <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--card)] p-3 shadow-sm shadow-foreground/[0.035]">
          <button
            className="btn-base btn-primary min-h-12 w-full px-4 text-sm"
            disabled={!canFinish}
            onClick={() => setIsAddingSchedule(true)}
            type="button"
          >
            <Check className="size-4" aria-hidden="true" />
            Continue to Schedule
          </button>
        </div> : null}

        {isAddingSchedule && pendingTeam ? (
          <div className="mt-4">
            <div className="mb-3 rounded-lg bg-[var(--accent-soft)] p-4">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--accent)]">Final setup step</p>
              <h2 className="mt-1 text-lg font-semibold text-foreground">Add games and bye weeks</h2>
            </div>
            <ScheduleEditor teamId={pendingTeam.id} onSaved={(schedule) => finishSetup(schedule.timeZone)} />
          </div>
        ) : null}
      </div>
    </section>
  );
}
