"use client";

import { useMemo, useRef, useState } from "react";
import { TeamSetupGate } from "@/components/TeamSetupGate";
import { resetFirstGameState, saveFirstGameState } from "@/lib/firstGameStorage";
import { updatePlayerSeasonStatsBaseline } from "@/lib/gameEngine";
import {
  deleteTeamPermanently,
  resetActiveTeam,
  updateActiveTeamPlayers,
  useActiveTeam,
} from "@/lib/teamStorage";
import { useFirstGameState } from "@/lib/useFirstGameState";
import type { PlayerGender } from "@/types/player";
import type { PlayerStats } from "@/types/stats";
import {
  countActivePlayers,
  filterRosterPlayers,
  findPlayerById,
  getEditingStatsBaseline,
  getPersistedPriorStats,
  getTeamDeletionErrorMessage,
  togglePlayerActive,
  updatePlayerGender,
  updatePlayerPrimaryPosition,
  updatePlayerSeasonStats,
} from "./rosterDecisions";
import {
  AddPlayerDialog,
  ClearTeamConfirmationDialog,
  EditPriorStatsDialog,
  useClearTeamDialogFocus,
} from "./RosterDialogs";
import { RosterPlayerGrid, RosterSummary, RosterToolbar } from "./RosterView";

type ActiveRosterTeam = NonNullable<ReturnType<typeof useActiveTeam>>;

export function RosterSection() {
  const activeTeam = useActiveTeam();

  if (!activeTeam) {
    return <TeamSetupGate title="Create your team before building the roster." />;
  }

  return <RosterSectionContent activeTeam={activeTeam} />;
}

function RosterSectionContent({ activeTeam }: { activeTeam: ActiveRosterTeam }) {
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

  const players = activeTeam.players;

  const filteredPlayers = useMemo(
    () => filterRosterPlayers(players, query, filter),
    [filter, players, query],
  );

  const activeCount = countActivePlayers(players);
  const editingStatsPlayer = findPlayerById(players, editingStatsPlayerId);
  const editingStatsBaseline = getEditingStatsBaseline(editingStatsPlayer, firstGameState);

  useClearTeamDialogFocus({
    isDeletingTeam,
    isOpen: showClearTeamConfirmation,
    onClose: () => setShowClearTeamConfirmation(false),
    refs: {
      cancelButtonRef: cancelDeleteTeamButtonRef,
      dialogRef: clearTeamDialogRef,
      triggerButtonRef: deleteTeamTriggerRef,
    },
  });

  function togglePlayer(playerId: string) {
    updateActiveTeamPlayers(togglePlayerActive(players, playerId));
  }

  function setPlayerGender(playerId: string, gender: PlayerGender) {
    if (gender === "Unknown") {
      return;
    }

    updateActiveTeamPlayers(updatePlayerGender(players, playerId, gender));
  }

  function setPlayerPosition(playerId: string, primaryPosition: string) {
    updateActiveTeamPlayers(updatePlayerPrimaryPosition(players, playerId, primaryPosition));
  }

  async function clearTeam() {
    if (isDeletingTeam) {
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
      setTeamDeletionError(getTeamDeletionErrorMessage(error));
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
    const nextGameState = updatePlayerSeasonStatsBaseline(firstGameState, playerId, seasonStats);
    const persistedSeasonStats = getPersistedPriorStats(players, playerId, seasonStats, firstGameState, nextGameState);

    updateActiveTeamPlayers(updatePlayerSeasonStats(players, playerId, persistedSeasonStats));

    if (nextGameState !== firstGameState) {
      saveFirstGameState(nextGameState);
    }

    setEditingStatsPlayerId(null);
  }

  return (
    <section className="bg-background py-6 sm:py-8">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <RosterSummary activeCount={activeCount} filter={filter} playerCount={players.length} visibleCount={filteredPlayers.length} />
        <RosterToolbar
          deleteTeamTriggerRef={deleteTeamTriggerRef}
          filter={filter}
          onAddPlayer={() => setShowAddPlayer(true)}
          onOpenClearTeamDialog={() => {
            setTeamDeletionError(null);
            setShowClearTeamConfirmation(true);
          }}
          onQueryChange={setQuery}
          onResetTeam={resetTeam}
          onSetFilter={setFilter}
          query={query}
        />
        <RosterPlayerGrid
          firstGameState={firstGameState}
          players={filteredPlayers}
          onEditStats={setEditingStatsPlayerId}
          onSetGender={setPlayerGender}
          onSetPosition={setPlayerPosition}
          onToggleActive={togglePlayer}
        />
      </div>

      <ClearTeamConfirmationDialog
        cancelButtonRef={cancelDeleteTeamButtonRef}
        dialogRef={clearTeamDialogRef}
        error={teamDeletionError}
        isDeleting={isDeletingTeam}
        isOpen={showClearTeamConfirmation}
        teamName={activeTeam.name}
        onCancel={() => setShowClearTeamConfirmation(false)}
        onDelete={clearTeam}
      />
      <AddPlayerDialog
        isOpen={showAddPlayer}
        isSaving={isSavingPlayer}
        seedOrder={activeTeam.players.length + 1}
        onClose={() => setShowAddPlayer(false)}
        onSavingChange={setIsSavingPlayer}
      />
      <EditPriorStatsDialog
        firstGameState={firstGameState}
        player={editingStatsPlayer}
        stats={editingStatsBaseline}
        onClose={() => setEditingStatsPlayerId(null)}
        onSave={savePriorStats}
      />
    </section>
  );
}
