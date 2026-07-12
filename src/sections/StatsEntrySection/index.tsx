"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, BarChart3, CalendarDays, RotateCcw, Save, Trophy, UserPlus, X } from "lucide-react";
import { LiveGameHeader } from "@/components/LiveGameHeader";
import { OutTypeModal } from "@/components/OutTypeModal";
import { ResultButton } from "@/components/ResultButton";
import { ScreenHeader } from "@/components/ScreenHeader";
import { StatTile } from "@/components/StatTile";
import { StatusPill } from "@/components/StatusPill";
import { TeamSetupGate } from "@/components/TeamSetupGate";
import { resetFirstGameState, saveFirstGameState } from "@/lib/firstGameStorage";
import {
  batterResults,
  createDefaultMovements,
  defaultRbiCredit,
  destinationLabel,
  destinationOptions,
  endGame,
  getCurrentBatter,
  getCurrentTeamPhase,
  getLiveGameHref,
  getLatestCorrectablePlay,
  getPlayerGameStats,
  getPlayerSeasonStats,
  getPlayValidationError,
  getResultLockReason,
  getTeamGameTotals,
  occupiedBaseEntries,
  previewPlay,
  replaceLatestSavedPlay,
  runnerSlotFromPlayer,
  savePlay,
  getStateBeforeLatestPlayCorrection,
  undoLastPlay,
  type GameState,
  type CompletedGameSummary,
  type MovementSelections,
  type PinchRunnerSelections,
} from "@/lib/gameEngine";
import { calculateStats, formatPercent, formatRate } from "@/lib/statCalculations";
import { useActiveTeam } from "@/lib/teamStorage";
import { usePregameSetup } from "@/lib/pregameSetupStorage";
import { useTeamSchedule } from "@/lib/scheduleClient";
import { useFirstGameState } from "@/lib/useFirstGameState";
import { cn } from "@/lib/utils";
import type { BatterResult, OutType } from "@/types/game";
import type { ScoredPlay } from "@/types/game";
import type { Player } from "@/types/player";
import type { BaseLabel, UiRunnerDestination } from "@/types/runner";
import type { ScheduleWeek } from "@/types/schedule";
import type { CalculatedStats, PlayerStats } from "@/types/stats";

export function StatsEntrySection() {
  const activeTeam = useActiveTeam();
  const gameState = useFirstGameState();
  const setup = usePregameSetup();
  const { schedule } = useTeamSchedule(activeTeam?.id ?? null);

  return renderStatsEntryGate(activeTeam, gameState, getScheduleWeeks(schedule), setup.gameId);
}

function renderStatsEntryGate(
  activeTeam: ReturnType<typeof useActiveTeam>,
  gameState: GameState,
  weeks: ScheduleWeek[],
  gameId: string | null,
) {
  if (!activeTeam) {
    return <TeamSetupGate title="Create your team before entering stats." />;
  }

  const scheduledGame = findScheduledStatsGame(weeks, gameId);

  return renderStatsEntryState(gameState, activeTeam.name, scheduledGame);
}

function getScheduleWeeks(schedule: ReturnType<typeof useTeamSchedule>["schedule"]) {
  return schedule?.weeks ?? [];
}

function renderStatsEntryState(
  gameState: GameState,
  teamName: string,
  scheduledGame: Extract<ScheduleWeek, { kind: "GAME" }> | null,
) {
  if (isPregameStatsEntry(gameState)) {
    return <PregameStatsEntryPrompt eligibleAt={getStatsEntryEligibleAt(scheduledGame)} teamName={teamName} />;
  }

  if (gameState.status === "FINAL") {
    return <EndGameSummary gameState={gameState} teamName={teamName} onReset={resetFirstGameState} />;
  }

  if (getCurrentTeamPhase(gameState) === "FIELDING") {
    return <DefensiveHalfPrompt gameState={gameState} teamName={teamName} />;
  }

  return <LiveStatsEntry gameState={gameState} teamName={teamName} />;
}

function findScheduledStatsGame(weeks: ScheduleWeek[], gameId: string | null) {
  return weeks.find((week): week is Extract<ScheduleWeek, { kind: "GAME" }> => (
    week.kind === "GAME" && week.gameId === gameId
  )) ?? null;
}

function isPregameStatsEntry(gameState: GameState) {
  return gameState.status === "PREGAME" || !gameState.lineup.length;
}

function getStatsEntryEligibleAt(scheduledGame: Extract<ScheduleWeek, { kind: "GAME" }> | null) {
  return scheduledGame
    ? new Date(Date.parse(scheduledGame.scheduledStartAt) - 5 * 60_000).toLocaleString()
    : null;
}

function DefensiveHalfPrompt({ gameState, teamName }: { gameState: GameState; teamName: string }) {
  function endCurrentGame() {
    saveFirstGameState(endGame(gameState, undefined, teamName));
  }

  return (
    <section className="bg-background pb-8 pt-3 sm:pb-10">
      <LiveGameHeader
        activeMode="OFFENSE"
        currentPhase="FIELDING"
        gameState={gameState}
        onEndGame={endCurrentGame}
        teamName={teamName}
      />
      <div className="mx-auto mt-3 w-full max-w-md px-3">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
            Stats Entry
          </p>
          <p className="mt-2 text-sm font-semibold text-foreground">
            Your team is fielding. Open Defense to record the next play.
          </p>
          <Link
            className="btn-base btn-primary mt-4 min-h-12 w-full px-4 text-sm"
            href="/defense"
          >
            Open Defense
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function LiveStatsEntry({ gameState, teamName }: { gameState: GameState; teamName: string }) {
  const router = useRouter();
  const [selectedResult, setSelectedResult] = useState<BatterResult | null>(null);
  const [selectedOutType, setSelectedOutType] = useState<OutType | undefined>();
  const [isOutTypeModalOpen, setIsOutTypeModalOpen] = useState(false);
  const [movements, setMovements] = useState<MovementSelections>({});
  const [rbiCredit, setRbiCredit] = useState(false);
  const [pinchRunners, setPinchRunners] = useState<PinchRunnerSelections>({});
  const [pinchBase, setPinchBase] = useState<BaseLabel | null>(null);
  const [editingPlayId, setEditingPlayId] = useState<string | null>(null);

  const correctablePlay = getLatestCorrectablePlay(gameState);
  const correctionState = useMemo(
    () => (editingPlayId ? getStateBeforeLatestPlayCorrection(gameState, editingPlayId) : null),
    [editingPlayId, gameState],
  );
  const scoringState = correctionState ?? gameState;

  const batter = getCurrentBatter(scoringState);
  const occupiedBases = occupiedBaseEntries(scoringState.bases);
  const defaultMovements = useMemo(
    () => (selectedResult ? createDefaultMovements(selectedResult, scoringState.bases) : {}),
    [scoringState.bases, selectedResult],
  );
  const effectiveMovements = useMemo(
    () => ({
      ...defaultMovements,
      ...movements,
    }),
    [defaultMovements, movements],
  );
  const preview = useMemo(
    () =>
      selectedResult
        ? previewPlay(scoringState, selectedResult, effectiveMovements, pinchRunners, rbiCredit, selectedOutType)
        : null,
    [effectiveMovements, pinchRunners, rbiCredit, scoringState, selectedOutType, selectedResult],
  );
  const batterGameStats = getPlayerGameStats(scoringState, batter.id);
  const batterStats = calculateStats(batterGameStats);
  const batterSeasonStats = calculateStats(getPlayerSeasonStats(batter, scoringState));
  const lastResultByBatter = useMemo(() => getLastResultByBatter(gameState.plays), [gameState.plays]);
  const previewDetails = getPreviewDetails(preview, scoringState.outs);
  const playValidationError = getCurrentPlayValidationError(
    scoringState,
    selectedResult,
    effectiveMovements,
    pinchRunners,
    selectedOutType,
  );
  const pinchRunnerOptions = getPinchRunnerOptions(scoringState.lineup, batter, occupiedBases, pinchRunners);

  function selectResult(result: BatterResult) {
    if (isResultLocked(result, scoringState)) {
      return;
    }

    if (shouldAskForOutType(result)) {
      setIsOutTypeModalOpen(true);
      return;
    }

    chooseResult(result);
  }

  function chooseResult(result: BatterResult, outType?: OutType) {
    const nextMovements = createDefaultMovements(result, scoringState.bases);
    const nextPreview = previewPlay(scoringState, result, nextMovements, pinchRunners, false, outType);

    setSelectedResult(result);
    setSelectedOutType(result === "Out" ? outType : undefined);
    setMovements(nextMovements);
    setRbiCredit(defaultRbiCredit(result, scoringState.bases, nextPreview.runs));
  }

  function selectOutType(outType: OutType) {
    setIsOutTypeModalOpen(false);
    chooseResult("Out", outType);
  }

  function changeMovement(base: BaseLabel, destination: UiRunnerDestination) {
    setMovements((current) => ({
      ...current,
      [base]: destination,
    }));
  }

  function persistNextState(nextState: GameState, followPhase = false) {
    saveFirstGameState(nextState);

    if (followPhase) {
      router.replace(getLiveGameHref(nextState));
    }
  }

  function resetPlayForm() {
    setSelectedResult(null);
    setSelectedOutType(undefined);
    setIsOutTypeModalOpen(false);
    setMovements({});
    setPinchRunners({});
    setRbiCredit(false);
    setEditingPlayId(null);
  }

  function editLatestPlay(play: ScoredPlay) {
    setEditingPlayId(play.id);
    setSelectedResult(play.result);
    setSelectedOutType(play.outType);
    setMovements(movementSelectionsFromPlay(play));
    setPinchRunners(pinchRunnerSelectionsFromPlay(play));
    setRbiCredit(play.rbis > 0);
  }

  function saveCurrentPlay() {
    const result = getSavableResult(selectedResult, selectedOutType, playValidationError);

    if (result === "NEEDS_OUT_TYPE") {
      setIsOutTypeModalOpen(true);
      return;
    }

    if (!result) {
      return;
    }

    const nextState = saveOrReplacePlay({
      editingPlayId,
      effectiveMovements,
      gameState,
      pinchRunners,
      rbiCredit,
      selectedOutType,
      selectedResult: result,
    });

    persistNextState(nextState, true);
    resetPlayForm();
  }

  function undo() {
    const previous = undoLastPlay(gameState);

    persistNextState(previous, true);
    resetPlayForm();
  }

  function endCurrentGame() {
    persistNextState(endGame(gameState, undefined, teamName));
    resetPlayForm();
    setPinchBase(null);
  }

  return (
    <section className="min-h-screen bg-background pb-28 pt-3 sm:pb-32">
      <LiveGameHeader
        activeMode="OFFENSE"
        currentPhase="BATTING"
        gameState={gameState}
        onEndGame={endCurrentGame}
        teamName={teamName}
      />
      <div className="mx-auto mt-3 flex w-full max-w-md flex-col gap-3 px-3">
        <BattingOrderNav
          correctablePlay={correctablePlay}
          currentBatterIndex={scoringState.currentBatterIndex}
          editingPlayId={editingPlayId}
          lastResultByBatter={lastResultByBatter}
          lineup={gameState.lineup}
          onEditLatestPlay={editLatestPlay}
        />

        <EditingPlayBanner
          batterName={batter.name}
          editingPlayId={editingPlayId}
          onCancel={resetPlayForm}
          onSave={saveCurrentPlay}
          playValidationError={playValidationError}
          selectedResult={selectedResult}
        />

        <CurrentBatterCard
          batter={batter}
          batterGameStats={batterGameStats}
          batterSeasonStats={batterSeasonStats}
          batterStats={batterStats}
          lineupPosition={scoringState.currentBatterIndex + 1}
        />

        <BatterResultPanel
          bases={scoringState.bases}
          onSelectResult={selectResult}
          outs={scoringState.outs}
          selectedResult={selectedResult}
        />

        <RunnersOnBasePanel
          effectiveMovements={effectiveMovements}
          occupiedBases={occupiedBases}
          onChangeMovement={changeMovement}
          onRemovePinchRunner={(base) => setPinchRunners((current) => removePinchRunner(current, base))}
          onSetPinchBase={setPinchBase}
          pinchRunners={pinchRunners}
        />

        <RbiControls
          batterName={batter.name}
          hasRuns={previewDetails.hasRuns}
          onSetRbiCredit={setRbiCredit}
          previewRuns={previewDetails.runs}
          rbiCredit={rbiCredit}
        />

        <AfterPlaySummary
          lastSummary={gameState.lastSummary}
          playValidationError={playValidationError}
          previewDetails={previewDetails}
          rbiCredit={rbiCredit}
        />
      </div>

      <StickyPlayActions
        canUndo={Boolean(gameState.history.length)}
        editingPlayId={editingPlayId}
        onSave={saveCurrentPlay}
        onUndo={undo}
        playValidationError={playValidationError}
        selectedResult={selectedResult}
      />

      <OutTypeModal
        isOpen={isOutTypeModalOpen}
        onClose={() => setIsOutTypeModalOpen(false)}
        onSelect={selectOutType}
      />

      <PinchRunnerModal
        onClose={() => setPinchBase(null)}
        onSelect={(player) => {
          setPinchRunners((current) => addPinchRunner(current, pinchBase, player, scoringState.bases));
          setPinchBase(null);
        }}
        pinchBase={pinchBase}
        players={pinchRunnerOptions}
      />
    </section>
  );
}

function BattingOrderNav({
  correctablePlay,
  currentBatterIndex,
  editingPlayId,
  lastResultByBatter,
  lineup,
  onEditLatestPlay,
}: {
  correctablePlay: ScoredPlay | null;
  currentBatterIndex: number;
  editingPlayId: string | null;
  lastResultByBatter: Map<string, BatterResult>;
  lineup: Player[];
  onEditLatestPlay: (play: ScoredPlay) => void;
}) {
  return (
    <nav
      aria-label="Batting order"
      className="-mx-3 overflow-x-auto border-y border-[var(--border)] bg-[var(--card)] px-3 py-2 sm:mx-0 sm:rounded-lg sm:border"
    >
      <div className="flex min-w-max gap-2">
        {lineup.map((player, index) => (
          <BattingOrderButton
            correctablePlay={correctablePlay}
            editingPlayId={editingPlayId}
            index={index}
            isCurrent={index === currentBatterIndex}
            key={player.id}
            lastResult={lastResultByBatter.get(player.id)}
            onEditLatestPlay={onEditLatestPlay}
            player={player}
          />
        ))}
      </div>
    </nav>
  );
}

function BattingOrderButton({
  correctablePlay,
  editingPlayId,
  index,
  isCurrent,
  lastResult,
  onEditLatestPlay,
  player,
}: {
  correctablePlay: ScoredPlay | null;
  editingPlayId: string | null;
  index: number;
  isCurrent: boolean;
  lastResult: BatterResult | undefined;
  onEditLatestPlay: (play: ScoredPlay) => void;
  player: Player;
}) {
  const canEdit = canEditBattingOrderPlay(correctablePlay, player.id, editingPlayId);

  return (
    <button
      className={cn(
        "grid min-h-12 min-w-20 content-center rounded-lg px-3 text-left text-sm font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]",
        isCurrent ? "bg-[var(--amber)] text-[var(--foreground)]" : "bg-[var(--surface)] text-foreground",
        canEdit && "ring-2 ring-inset ring-[var(--accent)]/35",
      )}
      disabled={!canEdit}
      onClick={() => correctablePlay && onEditLatestPlay(correctablePlay)}
      type="button"
    >
      <span>{index + 1}. {getFirstName(player.name)}</span>
      <span className={cn("mt-0.5 text-[0.68rem]", isCurrent ? "text-[var(--foreground)] opacity-75" : "text-[var(--muted-foreground)]")}>
        {getBattingOrderStatusLabel({ canEdit, editingPlayId, isCurrent, lastResult })}
      </span>
    </button>
  );
}

function EditingPlayBanner({
  batterName,
  editingPlayId,
  onCancel,
  onSave,
  playValidationError,
  selectedResult,
}: {
  batterName: string;
  editingPlayId: string | null;
  onCancel: () => void;
  onSave: () => void;
  playValidationError: string | null;
  selectedResult: BatterResult | null;
}) {
  if (!editingPlayId) {
    return null;
  }

  return (
    <div className="rounded-lg border border-[var(--accent)]/30 bg-[var(--accent-soft)] p-3 sm:flex sm:items-center sm:justify-between sm:gap-3">
      <div>
        <p className="text-sm font-bold text-[var(--accent-strong)]">Editing {batterName}&apos;s latest saved play</p>
        <p className="mt-1 text-xs font-semibold text-[var(--muted-foreground)]">
          Saving replaces the play and recalculates the score, outs, bases, and stats.
        </p>
      </div>
      <div className="mt-3 grid shrink-0 grid-cols-2 gap-2 sm:mt-0">
        <button className="btn-base btn-secondary min-h-11 px-3 text-sm" onClick={onCancel} type="button">
          Cancel
        </button>
        <button
          className="btn-base btn-primary min-h-11 px-3 text-sm"
          disabled={!selectedResult || Boolean(playValidationError)}
          onClick={onSave}
          type="button"
        >
          <Save className="size-4" aria-hidden="true" />
          Save Changes
        </button>
      </div>
    </div>
  );
}

function CurrentBatterCard({
  batter,
  batterGameStats,
  batterSeasonStats,
  batterStats,
  lineupPosition,
}: {
  batter: Player;
  batterGameStats: PlayerStats;
  batterSeasonStats: CalculatedStats;
  batterStats: CalculatedStats;
  lineupPosition: number;
}) {
  return (
    <article className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
            Current batter
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-foreground">{batter.name}</h2>
          <p className="mt-1 text-sm font-medium text-[var(--muted-foreground)]">
            {batter.roleHint}
          </p>
        </div>
        <StatusPill tone="ready">#{lineupPosition}</StatusPill>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <SummaryTile label="Game H-AB" value={`${batterGameStats.hits}-${batterGameStats.atBats}`} />
        <SummaryTile label="Game OBP" value={formatRate(batterStats.onBasePercentage)} />
        <SummaryTile label="Game SLG" value={formatRate(batterStats.sluggingPercentage)} />
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <SummaryTile label="Season OBP" value={formatRate(batterSeasonStats.onBasePercentage)} />
        <SummaryTile label="Speed" value={batter.speedRating} />
      </div>
    </article>
  );
}

function BatterResultPanel({
  bases,
  onSelectResult,
  outs,
  selectedResult,
}: {
  bases: GameState["bases"];
  onSelectResult: (result: BatterResult) => void;
  outs: number;
  selectedResult: BatterResult | null;
}) {
  return (
    <article className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
        Batter result
      </p>
      <div className="mt-3 grid grid-cols-5 gap-2">
        {batterResults.map((result) => (
          <BatterResultChoice
            bases={bases}
            key={result}
            onSelectResult={onSelectResult}
            outs={outs}
            result={result}
            selectedResult={selectedResult}
          />
        ))}
      </div>
    </article>
  );
}

function BatterResultChoice({
  bases,
  onSelectResult,
  outs,
  result,
  selectedResult,
}: {
  bases: GameState["bases"];
  onSelectResult: (result: BatterResult) => void;
  outs: number;
  result: BatterResult;
  selectedResult: BatterResult | null;
}) {
  const lockReason = getResultLockReason(result, bases, outs);

  return (
    <ResultButton
      disabled={Boolean(lockReason)}
      label={result}
      lockReason={lockReason ?? undefined}
      onClick={() => onSelectResult(result)}
      selected={result === selectedResult}
    />
  );
}

function RunnersOnBasePanel({
  effectiveMovements,
  occupiedBases,
  onChangeMovement,
  onRemovePinchRunner,
  onSetPinchBase,
  pinchRunners,
}: {
  effectiveMovements: MovementSelections;
  occupiedBases: ReturnType<typeof occupiedBaseEntries>;
  onChangeMovement: (base: BaseLabel, destination: UiRunnerDestination) => void;
  onRemovePinchRunner: (base: BaseLabel) => void;
  onSetPinchBase: (base: BaseLabel) => void;
  pinchRunners: PinchRunnerSelections;
}) {
  return (
    <article className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
            Runners on base
          </p>
          <p className="mt-1 text-sm font-semibold text-foreground">
            {occupiedBases.length ? "Auto-filled movement" : "Bases empty"}
          </p>
        </div>
        <StatusPill tone="planned" className="min-h-7 rounded-md px-2 py-0.5">
          Edit before save
        </StatusPill>
      </div>

      <div className="mt-3 space-y-2">
        {occupiedBases.length ? (
          occupiedBases.map(([base, runner]) => (
            <RunnerMovementRow
              base={base}
              effectiveMovements={effectiveMovements}
              key={base}
              onChangeMovement={onChangeMovement}
              onRemovePinchRunner={onRemovePinchRunner}
              onSetPinchBase={onSetPinchBase}
              pinchRunner={pinchRunners[base]}
              runner={runner}
            />
          ))
        ) : (
          <div className="rounded-lg bg-[var(--surface)] p-4 text-sm font-semibold text-[var(--muted-foreground)]">
            Bases empty
          </div>
        )}
      </div>
    </article>
  );
}

function RunnerMovementRow({
  base,
  effectiveMovements,
  onChangeMovement,
  onRemovePinchRunner,
  onSetPinchBase,
  pinchRunner,
  runner,
}: {
  base: BaseLabel;
  effectiveMovements: MovementSelections;
  onChangeMovement: (base: BaseLabel, destination: UiRunnerDestination) => void;
  onRemovePinchRunner: (base: BaseLabel) => void;
  onSetPinchBase: (base: BaseLabel) => void;
  pinchRunner: PinchRunnerSelections[BaseLabel] | undefined;
  runner: ReturnType<typeof occupiedBaseEntries>[number][1];
}) {
  const displayedRunner = pinchRunner ?? runner;

  return (
    <div className="rounded-lg bg-[var(--surface)] p-3">
      <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-start">
        <RunnerMovementLabel base={base} displayedRunnerName={displayedRunner.name} pinchRunner={pinchRunner} runnerName={runner.name} />
        <RunnerDestinationSelect base={base} effectiveMovements={effectiveMovements} onChangeMovement={onChangeMovement} />
      </div>
      <RunnerPinchControls
        base={base}
        onRemovePinchRunner={onRemovePinchRunner}
        onSetPinchBase={onSetPinchBase}
        pinchRunner={pinchRunner}
      />
    </div>
  );
}

function RunnerMovementLabel({
  base,
  displayedRunnerName,
  pinchRunner,
  runnerName,
}: {
  base: BaseLabel;
  displayedRunnerName: string;
  pinchRunner: PinchRunnerSelections[BaseLabel] | undefined;
  runnerName: string;
}) {
  return (
    <div>
      <p className="text-sm font-semibold text-foreground">
        {base}: {displayedRunnerName}
      </p>
      <p className="mt-1 text-xs text-[var(--muted-foreground)]">
        {getRunnerMovementSubtext(pinchRunner, runnerName)}
      </p>
    </div>
  );
}

function RunnerDestinationSelect({
  base,
  effectiveMovements,
  onChangeMovement,
}: {
  base: BaseLabel;
  effectiveMovements: MovementSelections;
  onChangeMovement: (base: BaseLabel, destination: UiRunnerDestination) => void;
}) {
  return (
    <select
      className="min-h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 text-sm font-bold text-foreground outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] sm:w-40"
      onChange={(event) => onChangeMovement(base, event.target.value as UiRunnerDestination)}
      value={effectiveMovements[base] ?? base}
    >
      {destinationOptions[base].map((destination) => (
        <option key={destination} value={destination}>
          {destinationLabel[destination]}
        </option>
      ))}
    </select>
  );
}

function RunnerPinchControls({
  base,
  onRemovePinchRunner,
  onSetPinchBase,
  pinchRunner,
}: {
  base: BaseLabel;
  onRemovePinchRunner: (base: BaseLabel) => void;
  onSetPinchBase: (base: BaseLabel) => void;
  pinchRunner: PinchRunnerSelections[BaseLabel] | undefined;
}) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <button
        className="btn-base btn-secondary min-h-9 px-3 text-xs text-[var(--accent)]"
        onClick={() => onSetPinchBase(base)}
        type="button"
      >
        <UserPlus className="size-4" aria-hidden="true" />
        {pinchRunner ? "Change" : "Use Pinch Runner"}
      </button>
      <RemovePinchRunnerButton base={base} onRemovePinchRunner={onRemovePinchRunner} pinchRunner={pinchRunner} />
    </div>
  );
}

function RemovePinchRunnerButton({
  base,
  onRemovePinchRunner,
  pinchRunner,
}: {
  base: BaseLabel;
  onRemovePinchRunner: (base: BaseLabel) => void;
  pinchRunner: PinchRunnerSelections[BaseLabel] | undefined;
}) {
  if (!pinchRunner) {
    return null;
  }

  return (
    <button className="btn-base btn-danger-secondary min-h-9 px-3 text-xs" onClick={() => onRemovePinchRunner(base)} type="button">
      Remove Pinch Runner
    </button>
  );
}

function RbiControls({
  batterName,
  hasRuns,
  onSetRbiCredit,
  previewRuns,
  rbiCredit,
}: {
  batterName: string;
  hasRuns: boolean;
  onSetRbiCredit: (credit: boolean) => void;
  previewRuns: number;
  rbiCredit: boolean;
}) {
  if (!hasRuns) {
    return null;
  }

  return (
    <article className="rounded-lg border border-[var(--accent)]/20 bg-[var(--accent-soft)] p-3">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--accent)]">
        RBI controls
      </p>
      <div className="mt-2 grid gap-3 sm:grid-cols-[1fr_12rem] sm:items-center">
        <p className="text-sm font-semibold text-[var(--accent-strong)]">
          {previewRuns} run{previewRuns === 1 ? "" : "s"} scored. Credit RBI to {getFirstName(batterName)}?
        </p>
        <div className="grid grid-cols-2 gap-2 text-center text-sm font-bold">
          <RbiChoiceButton label="Yes" onClick={() => onSetRbiCredit(true)} selected={rbiCredit} />
          <RbiChoiceButton label="No" onClick={() => onSetRbiCredit(false)} selected={!rbiCredit} />
        </div>
      </div>
    </article>
  );
}

function RbiChoiceButton({ label, onClick, selected }: { label: string; onClick: () => void; selected: boolean }) {
  return (
    <button
      className={cn("btn-base min-h-11 px-3", selected ? "btn-choice-selected" : "btn-secondary")}
      aria-pressed={selected}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function AfterPlaySummary({
  lastSummary,
  playValidationError,
  previewDetails,
  rbiCredit,
}: {
  lastSummary: string;
  playValidationError: string | null;
  previewDetails: ReturnType<typeof getPreviewDetails>;
  rbiCredit: boolean;
}) {
  return (
    <article className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
        After-play summary
      </p>
      <p className="mt-2 text-sm font-semibold text-foreground">{previewDetails.summary}</p>
      <PlayValidationErrorMessage playValidationError={playValidationError} />
      <div className="mt-3 grid grid-cols-3 gap-2">
        <SummaryTile label="Runs" value={`+${previewDetails.runs}`} />
        <SummaryTile label="Outs" value={previewDetails.outs} />
        <SummaryTile label="RBI" value={rbiCredit ? previewDetails.rbis : 0} />
      </div>
      <p className="mt-3 text-xs font-bold text-[var(--accent)]">
        Last saved: {lastSummary}
      </p>
    </article>
  );
}

function PlayValidationErrorMessage({ playValidationError }: { playValidationError: string | null }) {
  if (!playValidationError) {
    return null;
  }

  return (
    <p className="mt-2 rounded-md bg-[var(--danger-soft)] px-3 py-2 text-xs font-bold text-[var(--danger)]">
      {playValidationError}
    </p>
  );
}

function StickyPlayActions({
  canUndo,
  editingPlayId,
  onSave,
  onUndo,
  playValidationError,
  selectedResult,
}: {
  canUndo: boolean;
  editingPlayId: string | null;
  onSave: () => void;
  onUndo: () => void;
  playValidationError: string | null;
  selectedResult: BatterResult | null;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--border)] bg-[var(--card)]/95 px-3 py-3 shadow-2xl shadow-foreground/10 backdrop-blur">
      <div className="mx-auto grid w-full max-w-md grid-cols-[0.72fr_1.28fr] gap-2">
        <button className="btn-base btn-secondary min-h-12 text-sm" disabled={!canUndo} onClick={onUndo} type="button">
          <RotateCcw className="size-4" aria-hidden="true" />
          Undo
        </button>
        <button
          className="btn-base btn-primary min-h-12 px-3 text-sm"
          disabled={!selectedResult || Boolean(playValidationError)}
          onClick={onSave}
          type="button"
        >
          <Save className="size-4" aria-hidden="true" />
          {editingPlayId ? "Save Changes + Continue" : "Save Play + Next Batter"}
        </button>
      </div>
    </div>
  );
}

function PinchRunnerModal({
  onClose,
  onSelect,
  pinchBase,
  players,
}: {
  onClose: () => void;
  onSelect: (player: Player) => void;
  pinchBase: BaseLabel | null;
  players: Player[];
}) {
  if (!pinchBase) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/35 p-4">
      <div className="max-h-[calc(100dvh-2rem)] w-full max-w-[23rem] overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 shadow-2xl sm:max-w-md">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
              Pinch runner
            </p>
            <h2 className="mt-1 text-lg font-semibold text-foreground">
              Choose runner for {pinchBase}
            </h2>
          </div>
          <button className="btn-base btn-secondary size-10 min-h-0 p-0" onClick={onClose} type="button">
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
        <div className="mt-4 grid gap-2">
          {players.map((player) => (
            <button
              className="btn-base btn-secondary min-h-11 justify-start px-3 text-left text-sm"
              key={player.id}
              onClick={() => onSelect(player)}
              type="button"
            >
              {player.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function getLastResultByBatter(plays: ScoredPlay[]) {
  const results = new Map<string, BatterResult>();

  plays.forEach((play) => {
    results.set(play.batterId, play.result);
  });

  return results;
}

function getPreviewDetails(preview: ReturnType<typeof previewPlay> | null, currentOuts: number) {
  if (!preview) {
    return getEmptyPreviewDetails(currentOuts);
  }

  return {
    hasRuns: preview.runs > 0,
    outs: preview.projectedOuts,
    rbis: preview.rbis,
    runs: preview.runs,
    summary: preview.summary,
  };
}

function getEmptyPreviewDetails(currentOuts: number) {
  return {
    hasRuns: false,
    outs: currentOuts,
    rbis: 0,
    runs: 0,
    summary: "Tap a batter result to preview runner movement, runs, outs, and RBI.",
  };
}

function getCurrentPlayValidationError(
  scoringState: GameState,
  selectedResult: BatterResult | null,
  effectiveMovements: MovementSelections,
  pinchRunners: PinchRunnerSelections,
  selectedOutType: OutType | undefined,
) {
  return selectedResult
    ? getPlayValidationError(scoringState, selectedResult, effectiveMovements, pinchRunners, selectedOutType)
    : null;
}

function getPinchRunnerOptions(
  lineup: Player[],
  batter: Player,
  occupiedBases: ReturnType<typeof occupiedBaseEntries>,
  pinchRunners: PinchRunnerSelections,
) {
  const occupiedIds = new Set(occupiedBases.map(([, runner]) => runner.playerId));
  const selectedPinchRunnerIds = new Set(Object.values(pinchRunners).map((runner) => runner.playerId));

  return lineup.filter((player) => (
    player.id !== batter.id && !occupiedIds.has(player.id) && !selectedPinchRunnerIds.has(player.id)
  ));
}

function isResultLocked(result: BatterResult, scoringState: GameState) {
  return Boolean(getResultLockReason(result, scoringState.bases, scoringState.outs));
}

function shouldAskForOutType(result: BatterResult) {
  return result === "Out";
}

function getSavableResult(
  selectedResult: BatterResult | null,
  selectedOutType: OutType | undefined,
  playValidationError: string | null,
) {
  if (!selectedResult || playValidationError) {
    return null;
  }

  return needsOutTypeSelection(selectedResult, selectedOutType) ? "NEEDS_OUT_TYPE" as const : selectedResult;
}

function needsOutTypeSelection(selectedResult: BatterResult, selectedOutType: OutType | undefined) {
  return selectedResult === "Out" && !selectedOutType;
}

function saveOrReplacePlay({
  editingPlayId,
  effectiveMovements,
  gameState,
  pinchRunners,
  rbiCredit,
  selectedOutType,
  selectedResult,
}: {
  editingPlayId: string | null;
  effectiveMovements: MovementSelections;
  gameState: GameState;
  pinchRunners: PinchRunnerSelections;
  rbiCredit: boolean;
  selectedOutType: OutType | undefined;
  selectedResult: BatterResult;
}) {
  return editingPlayId
    ? replaceLatestSavedPlay(gameState, editingPlayId, selectedResult, effectiveMovements, pinchRunners, rbiCredit, selectedOutType)
    : savePlay(gameState, selectedResult, effectiveMovements, pinchRunners, rbiCredit, selectedOutType);
}

function removePinchRunner(current: PinchRunnerSelections, base: BaseLabel) {
  const next = { ...current };
  delete next[base];
  return next;
}

function addPinchRunner(
  current: PinchRunnerSelections,
  pinchBase: BaseLabel | null,
  player: Player,
  bases: GameState["bases"],
) {
  if (!pinchBase) {
    return current;
  }

  const originalRunner = bases[baseToKey(pinchBase)];

  return {
    ...current,
    [pinchBase]: {
      ...runnerSlotFromPlayer(player),
      originalPlayerId: originalRunner?.playerId,
      originalName: originalRunner?.name,
    },
  };
}

function canEditBattingOrderPlay(correctablePlay: ScoredPlay | null, playerId: string, editingPlayId: string | null) {
  return correctablePlay?.batterId === playerId && !editingPlayId;
}

function getBattingOrderStatusLabel({
  canEdit,
  editingPlayId,
  isCurrent,
  lastResult,
}: {
  canEdit: boolean;
  editingPlayId: string | null;
  isCurrent: boolean;
  lastResult: BatterResult | undefined;
}) {
  if (isCurrent) {
    return getCurrentBatterStatusLabel(editingPlayId);
  }

  return getInactiveBatterStatusLabel(canEdit, lastResult);
}

function getCurrentBatterStatusLabel(editingPlayId: string | null) {
  return editingPlayId ? "Editing" : "At bat";
}

function getInactiveBatterStatusLabel(canEdit: boolean, lastResult: BatterResult | undefined) {
  return canEdit ? "Edit last play" : lastResult ?? "Ready";
}

function getFirstName(name: string) {
  return name.split(" ")[0];
}

function getRunnerMovementSubtext(
  pinchRunner: PinchRunnerSelections[BaseLabel] | undefined,
  runnerName: string,
) {
  return pinchRunner ? `Pinch running for ${runnerName}` : "Original runner";
}

function EndGameSummary({
  gameState,
  teamName,
  onReset,
}: {
  gameState: GameState;
  teamName: string;
  onReset: () => void;
}) {
  return (
    <FinalGameStatsView
      finishHref="/"
      finishLabel="Finish Game"
      gameState={gameState}
      onReset={onReset}
      teamName={teamName}
    />
  );
}

export function FinalGameStatsView({
  gameState,
  teamName,
  onReset,
  finishHref = "/stats",
  finishLabel = "Back to Season Stats",
}: {
  gameState: GameState;
  teamName: string;
  onReset?: () => void;
  finishHref?: string;
  finishLabel?: string;
}) {
  const router = useRouter();
  const teamTotals = getTeamGameTotals(gameState);
  const playerRows = gameState.lineup.map((player) => {
    const stats = getPlayerGameStats(gameState, player.id);
    const calculated = calculateStats(stats);

    return {
      player,
      stats,
      calculated,
    };
  });

  function finishGame() {
    saveFirstGameState(gameState);
    router.push(finishHref);
  }

  return (
    <section className="bg-background py-6 sm:py-8">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <ScreenHeader
          description="The game is final. These totals come from this completed game only."
          eyebrow="Final"
          icon={Trophy}
          status="Final Game Stats"
          title={`${teamName} ${gameState.teamScore} - ${gameState.opponent} ${gameState.opponentScore}`}
        />

        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <StatTile helper="Final score" label="Runs" tone="accent" value={String(teamTotals.runs)} />
          <StatTile helper={`${gameState.plays.length} saved`} label="Plays" value={String(gameState.plays.length)} />
          <StatTile helper={`${teamTotals.hits} hits`} label="AVG" tone="success" value={formatRate(teamTotals.battingAverage)} />
          <StatTile helper={`OPS ${formatRate(teamTotals.ops)}`} label="OBP" value={formatRate(teamTotals.onBasePercentage)} />
        </div>

        <div className="mt-4 grid min-w-0 items-stretch gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <article className="order-1 flex h-full min-w-0 flex-col rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm shadow-foreground/[0.035] lg:order-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                  Final Game Stats
                </p>
                <h2 className="mt-1 text-lg font-semibold text-foreground">
                  Final box score
                </h2>
              </div>
              <StatusPill tone="ready">Final</StatusPill>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <SummaryTile label="PA" value={teamTotals.plateAppearances} />
              <SummaryTile label="AB" value={teamTotals.atBats} />
              <SummaryTile label="H" value={teamTotals.hits} />
              <SummaryTile label="BB" value={teamTotals.walks} />
              <SummaryTile label="ROE" value={teamTotals.reachedOnError} />
              <SummaryTile label="RBI" value={teamTotals.rbis} />
              <SummaryTile label="SLG" value={formatRate(teamTotals.sluggingPercentage)} />
              <SummaryTile label="OPS" value={formatRate(teamTotals.ops)} />
              <SummaryTile label="Out%" value={formatPercent(teamTotals.outs / Math.max(1, teamTotals.plateAppearances))} />
            </div>

            <div className="mt-4 rounded-lg bg-[var(--surface)] p-3 text-sm font-semibold text-foreground">
              {gameState.lastSummary}
            </div>

            <button
              className="btn-base btn-primary mt-auto min-h-12 w-full text-sm"
              onClick={finishGame}
              type="button"
            >
              {onReset ? <Save className="size-4" aria-hidden="true" /> : null}
              {finishLabel}
              <ArrowRight className="size-4" aria-hidden="true" />
            </button>

            {onReset ? (
              <button
                className="btn-base btn-secondary mt-2 min-h-11 w-full text-sm text-[var(--muted-foreground)]"
                onClick={onReset}
                type="button"
              >
                <RotateCcw className="size-4" aria-hidden="true" />
                Reset Game
              </button>
            ) : null}
          </article>

          <StatsPlayerTable className="order-2 min-w-0 lg:order-1" label="Player Game Stats" rows={playerRows} />
        </div>
      </div>
    </section>
  );
}

export type StatsPlayerRow = {
  player: Player;
  stats: PlayerStats;
  calculated: CalculatedStats;
};

export function StatsPlayerTable({
  rows,
  label,
  className,
}: {
  rows: StatsPlayerRow[];
  label: string;
  className?: string;
}) {
  return (
    <article className={cn("flex h-full min-w-0 flex-col rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm shadow-foreground/[0.035]", className)}>
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
        {label}
      </p>
      <div className="mt-3 w-full min-w-0 overflow-x-auto">
        <table className="w-full min-w-[680px] border-separate border-spacing-y-2 text-left text-sm">
          <thead className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--muted-foreground)]">
            <tr>
              <th className="px-3">Player</th>
              <th className="px-3">PA</th>
              <th className="px-3">H</th>
              <th className="px-3">R</th>
              <th className="px-3">RBI</th>
              <th className="px-3">AVG</th>
              <th className="px-3">OBP</th>
              <th className="px-3">SLG</th>
              <th className="px-3">OPS</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ player, stats, calculated }) => (
              <tr className="bg-[var(--surface)] font-semibold text-foreground" key={player.id}>
                <td className="rounded-l-lg px-3 py-2">{player.name}</td>
                <td className="px-3 py-2">{stats.plateAppearances}</td>
                <td className="px-3 py-2">{stats.hits}</td>
                <td className="px-3 py-2">{stats.runs}</td>
                <td className="px-3 py-2">{stats.rbis}</td>
                <td className="px-3 py-2">{formatRate(calculated.battingAverage)}</td>
                <td className="px-3 py-2">{formatRate(calculated.onBasePercentage)}</td>
                <td className="px-3 py-2">{formatRate(calculated.sluggingPercentage)}</td>
                <td className="rounded-r-lg px-3 py-2">{formatRate(calculated.ops)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

export function GameHistoryCard({
  games,
  currentGameId,
  className,
}: {
  games: CompletedGameSummary[];
  currentGameId?: string;
  className?: string;
}) {
  return (
    <article className={cn("flex h-full min-w-0 flex-col rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm shadow-foreground/[0.035]", className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
            Game History
          </p>
          <h2 className="mt-1 text-lg font-semibold text-foreground">
            Completed games
          </h2>
        </div>
        <CalendarDays className="size-5 text-[var(--accent)]" aria-hidden="true" />
      </div>

      <div className="mt-4 grid flex-1 content-start gap-2">
        {games.length ? (
          games.map((game) => {
            const isCurrent = game.id === currentGameId;

            return (
              <Link
                className={cn(
                  "block min-w-0 rounded-lg border p-3 text-sm transition",
                  isCurrent
                    ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                    : "border-transparent bg-[var(--surface)] hover:border-[var(--accent)]/30",
                )}
                href={game.href}
                key={game.id}
              >
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-bold text-foreground">
                      {game.opponent}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-[var(--muted-foreground)]">
                      {formatGameDate(game.endedAt)}
                    </p>
                  </div>
                  <StatusPill className="shrink-0" tone={game.result === "Win" ? "ready" : "planned"}>{game.result}</StatusPill>
                </div>
                <p className="mt-3 break-words text-lg font-semibold text-foreground">
                  Us {game.teamScore} - Them {game.opponentScore}
                </p>
                <GameHistoryBreakdownGrid breakdown={game.matchBreakdown} />
                <p className="mt-1 text-xs font-bold text-[var(--muted-foreground)]">
                  {getGameHistorySavedLabel(game)}
                </p>
              </Link>
            );
          })
        ) : (
          <div className="rounded-lg bg-[var(--surface)] p-4 text-sm font-semibold text-[var(--muted-foreground)]">
            No completed games yet. Finish a game from Stats Entry to add it here.
          </div>
        )}
      </div>
    </article>
  );
}

function GameHistoryBreakdownGrid({
  breakdown,
}: {
  breakdown: CompletedGameSummary["matchBreakdown"];
}) {
  if (!breakdown) {
    return null;
  }

  return (
    <div className="mt-3 grid grid-cols-3 gap-1.5">
      <GameHistoryBreakdownStat label="PA" value={String(breakdown.plateAppearances)} />
      <GameHistoryBreakdownStat label="H" value={String(breakdown.hits)} />
      <GameHistoryBreakdownStat label="BB" value={String(breakdown.walks)} />
      <GameHistoryBreakdownStat label="RBI" value={String(breakdown.rbis)} />
      <GameHistoryBreakdownStat label="AVG" value={formatRate(breakdown.battingAverage)} />
      <GameHistoryBreakdownStat label="OBP" value={formatRate(breakdown.onBasePercentage)} />
    </div>
  );
}

function GameHistoryBreakdownStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-[var(--card)] px-2 py-1.5">
      <p className="text-[0.62rem] font-bold uppercase text-[var(--muted-foreground)]">{label}</p>
      <p className="mt-0.5 text-sm font-bold text-foreground">{value}</p>
    </div>
  );
}

function getGameHistorySavedLabel(game: CompletedGameSummary) {
  if (game.playCount > 0) {
    return `${game.playCount} play${game.playCount === 1 ? "" : "s"} saved`;
  }

  return game.hasBoxScore ? "Box score saved" : "No plays saved";
}

function PregameStatsEntryPrompt({ teamName, eligibleAt }: { teamName: string; eligibleAt: string | null }) {
  return (
    <section className="bg-background py-6 sm:py-8">
      <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 lg:px-8">
        <ScreenHeader
          description={eligibleAt ? `Live scoring stays locked until ${eligibleAt}. You can prepare and accept the lineup now.` : "Choose a scheduled game, generate the lineup, let the coach approve it, then start the game to unlock live scoring."}
          eyebrow="Stats entry"
          icon={BarChart3}
          status="Pregame"
          title={`Start ${teamName} from the approved lineup.`}
        />
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Link
            className="btn-base btn-secondary min-h-12 px-4 text-sm"
            href="/game-setup"
          >
            Game Setup
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
          <Link
            className="btn-base btn-primary min-h-12 px-4 text-sm"
            href="/batting-order"
          >
            Review Lineup
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function SummaryTile({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg bg-[var(--surface)] px-3 py-2">
      <p className="text-xs font-bold text-[var(--muted-foreground)]">{label}</p>
      <p className="mt-1 text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}

function formatGameDate(value: string | null) {
  if (!value) {
    return "Final";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function baseToKey(base: BaseLabel) {
  if (base === "1B") return "first";
  if (base === "2B") return "second";
  return "third";
}

function movementSelectionsFromPlay(play: ScoredPlay): MovementSelections {
  const selections: MovementSelections = {};

  for (const movement of play.runnerAdvancements) {
    if (movement.fromBase === "BATTER") {
      continue;
    }

    selections[movement.fromBase] = toMovementSelection(movement.toBase);
  }

  return selections;
}

function toMovementSelection(toBase: ScoredPlay["runnerAdvancements"][number]["toBase"]) {
  return movementSelectionByDestination[toBase];
}

const movementSelectionByDestination: Record<ScoredPlay["runnerAdvancements"][number]["toBase"], UiRunnerDestination> = {
  "1B": "1B",
  "2B": "2B",
  "3B": "3B",
  HOME: "Scores",
  OUT: "Out",
};

function pinchRunnerSelectionsFromPlay(play: ScoredPlay): PinchRunnerSelections {
  const selections: PinchRunnerSelections = {};

  for (const movement of play.runnerAdvancements) {
    if (movement.fromBase === "BATTER" || !movement.originalPlayerId) {
      continue;
    }

    selections[movement.fromBase] = {
      playerId: movement.playerId,
      name: movement.playerName,
      originalPlayerId: movement.originalPlayerId,
      originalName: movement.originalPlayerName,
    };
  }

  return selections;
}
