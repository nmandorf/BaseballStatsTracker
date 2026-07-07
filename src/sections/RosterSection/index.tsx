"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
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

type ActiveRosterTeam = NonNullable<ReturnType<typeof useActiveTeam>>;
type FirstGameState = ReturnType<typeof useFirstGameState>;
type RosterFilter = "all" | "active" | "inactive";
type ClearTeamDialogRefs = {
  dialogRef: RefObject<HTMLDivElement | null>;
  cancelButtonRef: RefObject<HTMLButtonElement | null>;
  triggerButtonRef: RefObject<HTMLButtonElement | null>;
};

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

function RosterSummary({
  activeCount,
  filter,
  playerCount,
  visibleCount,
}: {
  activeCount: number;
  filter: RosterFilter;
  playerCount: number;
  visibleCount: number;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <StatTile helper="On this team" icon={UserRound} label="Players" value={String(playerCount)} />
      <StatTile helper="Available for games" icon={ClipboardList} label="Active" tone="success" value={String(activeCount)} />
      <StatTile helper={getVisiblePlayersHelper(filter)} icon={Filter} label="Visible" tone="accent" value={String(visibleCount)} />
    </div>
  );
}

function RosterToolbar({
  deleteTeamTriggerRef,
  filter,
  onAddPlayer,
  onOpenClearTeamDialog,
  onQueryChange,
  onResetTeam,
  onSetFilter,
  query,
}: {
  deleteTeamTriggerRef: RefObject<HTMLButtonElement | null>;
  filter: RosterFilter;
  onAddPlayer: () => void;
  onOpenClearTeamDialog: () => void;
  onQueryChange: (query: string) => void;
  onResetTeam: () => void;
  onSetFilter: (filter: RosterFilter) => void;
  query: string;
}) {
  return (
    <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--card)] p-3 shadow-sm shadow-foreground/[0.035]">
      <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
        <RosterSearchField onQueryChange={onQueryChange} query={query} />
        <RosterToolbarActions
          deleteTeamTriggerRef={deleteTeamTriggerRef}
          filter={filter}
          onAddPlayer={onAddPlayer}
          onOpenClearTeamDialog={onOpenClearTeamDialog}
          onResetTeam={onResetTeam}
          onSetFilter={onSetFilter}
        />
      </div>
    </div>
  );
}

function RosterSearchField({
  onQueryChange,
  query,
}: {
  onQueryChange: (query: string) => void;
  query: string;
}) {
  return (
    <label className="flex min-h-11 items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm font-semibold text-[var(--muted-foreground)]">
      <Search className="size-4" aria-hidden="true" />
      <input
        className="w-full bg-transparent text-foreground outline-none placeholder:text-[var(--muted-foreground)]"
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder="Search players"
        value={query}
      />
    </label>
  );
}

function RosterToolbarActions({
  deleteTeamTriggerRef,
  filter,
  onAddPlayer,
  onOpenClearTeamDialog,
  onResetTeam,
  onSetFilter,
}: {
  deleteTeamTriggerRef: RefObject<HTMLButtonElement | null>;
  filter: RosterFilter;
  onAddPlayer: () => void;
  onOpenClearTeamDialog: () => void;
  onResetTeam: () => void;
  onSetFilter: (filter: RosterFilter) => void;
}) {
  return (
    <div className="grid min-w-0 grid-cols-2 gap-2 sm:flex sm:flex-wrap">
      {(["all", "active", "inactive"] as const).map((item) => (
        <RosterFilterButton active={filter === item} filter={item} key={item} onSetFilter={onSetFilter} />
      ))}
      <button className="btn-base btn-primary min-h-10 min-w-0 rounded-full px-3 text-xs leading-tight" onClick={onAddPlayer} type="button">
        <UserPlus className="size-4" aria-hidden="true" />
        Add Player
      </button>
      <button className="btn-base btn-secondary min-h-10 min-w-0 rounded-full px-3 text-xs leading-tight" onClick={onResetTeam} type="button">
        <RotateCcw className="size-4" aria-hidden="true" />
        Reset Game
      </button>
      <button
        className="btn-base btn-danger-secondary min-h-10 min-w-0 rounded-full px-3 text-xs leading-tight"
        onClick={onOpenClearTeamDialog}
        ref={deleteTeamTriggerRef}
        type="button"
      >
        Clear Team
      </button>
    </div>
  );
}

function RosterFilterButton({
  active,
  filter,
  onSetFilter,
}: {
  active: boolean;
  filter: RosterFilter;
  onSetFilter: (filter: RosterFilter) => void;
}) {
  return (
    <button
      className={cn(
        "btn-base min-h-10 min-w-0 rounded-full px-3 text-center text-xs",
        active ? "btn-choice-selected" : "btn-choice",
      )}
      aria-pressed={active}
      onClick={() => onSetFilter(filter)}
      type="button"
    >
      {formatRosterFilterLabel(filter)}
    </button>
  );
}

function RosterPlayerGrid({
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
      <button className="btn-base btn-secondary min-h-11 px-3 text-sm" onClick={() => onEditStats(player.id)} type="button">
        <PencilLine className="size-4" aria-hidden="true" />
        Edit Prior Stats
      </button>
      <RosterActiveToggleButton player={player} onToggleActive={onToggleActive} />
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
      className={cn("btn-base min-h-11 text-sm", player.isActive ? "btn-danger-secondary" : "btn-secondary")}
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
        <RosterGenderButton active={player.gender === gender} gender={gender} key={gender} onClick={() => onSetGender(player.id, gender)} />
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
      className={cn("btn-base min-h-10 px-3 text-xs", active ? "btn-choice-selected" : "btn-choice")}
      aria-pressed={active}
      onClick={onClick}
      type="button"
    >
      {gender}
    </button>
  );
}

function ClearTeamConfirmationDialog({
  cancelButtonRef,
  dialogRef,
  error,
  isDeleting,
  isOpen,
  teamName,
  onCancel,
  onDelete,
}: {
  cancelButtonRef: RefObject<HTMLButtonElement | null>;
  dialogRef: RefObject<HTMLDivElement | null>;
  error: string | null;
  isDeleting: boolean;
  isOpen: boolean;
  teamName: string;
  onCancel: () => void;
  onDelete: () => void;
}) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-4 sm:items-center">
      <div
        aria-describedby="clear-team-dialog-description"
        aria-labelledby="clear-team-dialog-title"
        aria-modal="true"
        className="w-full max-w-md rounded-lg border border-[var(--danger)]/25 bg-[var(--card)] p-5 shadow-2xl"
        ref={dialogRef}
        role="alertdialog"
      >
        <ClearTeamDialogHeader teamName={teamName} />
        <ClearTeamDialogError error={error} />
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button className="btn-base btn-secondary min-h-11 px-4 text-sm" disabled={isDeleting} onClick={onCancel} ref={cancelButtonRef} type="button">
            Cancel
          </button>
          <button className="btn-base btn-danger min-h-11 px-4 text-sm" disabled={isDeleting} onClick={onDelete} type="button">
            {isDeleting ? "Deleting..." : "Delete Team Permanently"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ClearTeamDialogHeader({ teamName }: { teamName: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[var(--danger-soft)] text-[var(--danger)]">
        <AlertTriangle className="size-5" aria-hidden="true" />
      </div>
      <div>
        <h2 className="text-xl font-semibold text-foreground" id="clear-team-dialog-title">
          Permanently delete {teamName}?
        </h2>
        <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]" id="clear-team-dialog-description">
          This deletes the team, roster, games, and stats from the database. This action cannot be undone.
        </p>
      </div>
    </div>
  );
}

function ClearTeamDialogError({ error }: { error: string | null }) {
  if (!error) {
    return null;
  }

  return (
    <p className="mt-4 rounded-lg bg-[var(--danger-soft)] px-3 py-2 text-sm font-bold text-[var(--danger)]" role="alert">
      {error}
    </p>
  );
}

function AddPlayerDialog({
  isOpen,
  isSaving,
  seedOrder,
  onClose,
  onSavingChange,
}: {
  isOpen: boolean;
  isSaving: boolean;
  seedOrder: number;
  onClose: () => void;
  onSavingChange: (isSaving: boolean) => void;
}) {
  if (!isOpen) {
    return null;
  }

  async function submitPlayer(input: Parameters<typeof addPlayerToActiveTeamBackend>[0]) {
    onSavingChange(true);

    try {
      await addPlayerToActiveTeamBackend(input);
      onClose();
    } finally {
      onSavingChange(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/35 p-4">
      <div
        aria-labelledby="add-player-dialog-title"
        aria-modal="true"
        className="max-h-[calc(100dvh-2rem)] w-full max-w-[38rem] overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--card)] p-5 shadow-2xl sm:p-4"
        role="dialog"
      >
        <RosterDialogHeader closeLabel="Close add player dialog" title="Add new player" titleId="add-player-dialog-title" onClose={onClose} />
        <PlayerForm
          seedOrder={seedOrder}
          submitLabel={isSaving ? "Saving Player..." : "Save Player"}
          variant="plain"
          onCancel={onClose}
          onSubmit={submitPlayer}
        />
      </div>
    </div>
  );
}

function EditPriorStatsDialog({
  firstGameState,
  player,
  stats,
  onClose,
  onSave,
}: {
  firstGameState: FirstGameState;
  player: Player | null;
  stats: PlayerStats | null;
  onClose: () => void;
  onSave: (playerId: string, seasonStats: PlayerStats) => void;
}) {
  if (!player || !stats) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/35 p-4">
      <div
        aria-labelledby="edit-prior-stats-dialog-title"
        aria-modal="true"
        className="max-h-[calc(100dvh-2rem)] w-full max-w-[38rem] overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 shadow-2xl sm:p-5"
        role="dialog"
      >
        <RosterDialogHeader closeLabel="Close prior stats editor" sticky title="Edit Prior Stats" titleId="edit-prior-stats-dialog-title" onClose={onClose} />
        <PriorStatsEditor
          playerName={player.name}
          stats={stats}
          currentGameStats={getPlayerGameStats(firstGameState, player.id)}
          onCancel={onClose}
          onSave={(seasonStats) => onSave(player.id, seasonStats)}
        />
      </div>
    </div>
  );
}

function RosterDialogHeader({
  closeLabel,
  sticky = false,
  title,
  titleId,
  onClose,
}: {
  closeLabel: string;
  sticky?: boolean;
  title: string;
  titleId: string;
  onClose: () => void;
}) {
  return (
    <div className={cn(sticky ? "sticky -top-4 z-10 mb-4 border-b py-3" : "mb-5 sm:mb-4", "flex items-start justify-between gap-3 border-[var(--border)] bg-[var(--card)]")}>
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
          Roster
        </p>
        <h2 className="mt-1 text-xl font-semibold text-foreground" id={titleId}>
          {title}
        </h2>
      </div>
      <button aria-label={closeLabel} className="btn-base btn-secondary size-11 min-h-0 shrink-0 p-0" onClick={onClose} type="button">
        <X className="size-5" aria-hidden="true" />
      </button>
    </div>
  );
}

function useClearTeamDialogFocus({
  isDeletingTeam,
  isOpen,
  onClose,
  refs,
}: {
  isDeletingTeam: boolean;
  isOpen: boolean;
  onClose: () => void;
  refs: ClearTeamDialogRefs;
}) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const triggerElement = refs.triggerButtonRef.current;
    refs.cancelButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      handleClearTeamDialogKeyDown(event, {
        dialogRef: refs.dialogRef,
        isDeletingTeam,
        onClose,
      });
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      triggerElement?.focus();
    };
  }, [isDeletingTeam, isOpen, onClose, refs.cancelButtonRef, refs.dialogRef, refs.triggerButtonRef]);
}

function handleClearTeamDialogKeyDown(
  event: KeyboardEvent,
  context: {
    dialogRef: RefObject<HTMLDivElement | null>;
    isDeletingTeam: boolean;
    onClose: () => void;
  },
) {
  if (closeClearTeamDialogFromEscape(event, context)) {
    return;
  }

  if (event.key === "Tab") {
    trapFocusInsideClearTeamDialog(event, context.dialogRef);
  }
}

function closeClearTeamDialogFromEscape(
  event: KeyboardEvent,
  { isDeletingTeam, onClose }: { isDeletingTeam: boolean; onClose: () => void },
) {
  if (event.key !== "Escape" || isDeletingTeam) {
    return false;
  }

  onClose();
  return true;
}

function trapFocusInsideClearTeamDialog(
  event: KeyboardEvent,
  dialogRef: RefObject<HTMLDivElement | null>,
) {
  const focusableElements = getClearTeamDialogFocusableElements(dialogRef);

  if (!focusableElements.length) {
    return;
  }

  moveFocusWithinDialog(event, focusableElements[0], focusableElements[focusableElements.length - 1]);
}

function getClearTeamDialogFocusableElements(dialogRef: RefObject<HTMLDivElement | null>) {
  return Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(
    "button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex='-1'])",
  ) ?? []);
}

function moveFocusWithinDialog(
  event: KeyboardEvent,
  firstElement: HTMLElement,
  lastElement: HTMLElement,
) {
  moveFocusToEndFromFirstElement(event, firstElement, lastElement);
  moveFocusToStartFromLastElement(event, firstElement, lastElement);
}

function moveFocusToEndFromFirstElement(
  event: KeyboardEvent,
  firstElement: HTMLElement,
  lastElement: HTMLElement,
) {
  if (!event.shiftKey || document.activeElement !== firstElement) {
    return;
  }

  event.preventDefault();
  lastElement.focus();
}

function moveFocusToStartFromLastElement(
  event: KeyboardEvent,
  firstElement: HTMLElement,
  lastElement: HTMLElement,
) {
  if (event.shiftKey || document.activeElement !== lastElement) {
    return;
  }

  event.preventDefault();
  firstElement.focus();
}

function filterRosterPlayers(players: Player[], query: string, filter: RosterFilter) {
  const normalizedQuery = query.trim().toLowerCase();
  return players.filter((player) => matchesRosterQuery(player, normalizedQuery) && matchesRosterFilter(player, filter));
}

function matchesRosterQuery(player: Player, normalizedQuery: string) {
  return !normalizedQuery || player.name.toLowerCase().includes(normalizedQuery);
}

function matchesRosterFilter(player: Player, filter: RosterFilter) {
  return filter === "all" || player.isActive === (filter === "active");
}

function countActivePlayers(players: Player[]) {
  return players.filter((player) => player.isActive).length;
}

function findPlayerById(players: Player[], playerId: string | null) {
  return playerId ? players.find((player) => player.id === playerId) ?? null : null;
}

function getEditingStatsBaseline(editingStatsPlayer: Player | null, firstGameState: FirstGameState) {
  if (!editingStatsPlayer) {
    return null;
  }

  return firstGameState.lineup.find((lineupPlayer) => lineupPlayer.id === editingStatsPlayer.id)?.seasonStats ?? editingStatsPlayer.seasonStats;
}

function togglePlayerActive(players: Player[], playerId: string) {
  return players.map((player) => (
    player.id === playerId ? { ...player, isActive: !player.isActive } : player
  ));
}

function updatePlayerGender(players: Player[], playerId: string, gender: Exclude<PlayerGender, "Unknown">) {
  return players.map((player) => (
    player.id === playerId ? { ...player, gender } : player
  ));
}

function updatePlayerPrimaryPosition(players: Player[], playerId: string, primaryPosition: string) {
  return players.map((player) => (
    player.id === playerId ? { ...player, primaryPosition } : player
  ));
}

function getTeamDeletionErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Unable to delete the team. Please try again.";
}

function getPersistedPriorStats(
  players: Player[],
  playerId: string,
  seasonStats: PlayerStats,
  previousGameState: FirstGameState,
  nextGameState: FirstGameState,
) {
  const player = players.find((item) => item.id === playerId);

  if (!player || nextGameState === previousGameState) {
    return seasonStats;
  }

  return getPlayerSeasonStats({ ...player, seasonStats }, nextGameState);
}

function updatePlayerSeasonStats(players: Player[], playerId: string, seasonStats: PlayerStats) {
  return players.map((player) => (
    player.id === playerId ? { ...player, seasonStats } : player
  ));
}

function getVisiblePlayersHelper(filter: RosterFilter) {
  return filter === "all" ? "Showing all" : `Showing ${filter}`;
}

function formatRosterFilterLabel(filter: RosterFilter) {
  return filter[0].toUpperCase() + filter.slice(1);
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
