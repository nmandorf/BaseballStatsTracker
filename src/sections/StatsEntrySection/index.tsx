"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, BarChart3, CalendarDays, Flag, RotateCcw, Save, Trophy, UserPlus, X } from "lucide-react";
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
  getPlayerGameStats,
  getPlayerSeasonStats,
  getPlayValidationError,
  getResultLockReason,
  getTeamGameTotals,
  occupiedBaseEntries,
  previewPlay,
  runnerSlotFromPlayer,
  savePlay,
  undoLastPlay,
  type GameState,
  type CompletedGameSummary,
  type MovementSelections,
  type PinchRunnerSelections,
} from "@/lib/gameEngine";
import { calculateStats, formatPercent, formatRate } from "@/lib/statCalculations";
import { useActiveTeam } from "@/lib/teamStorage";
import { useFirstGameState } from "@/lib/useFirstGameState";
import { cn } from "@/lib/utils";
import type { BatterResult, OutType } from "@/types/game";
import type { Player } from "@/types/player";
import type { BaseLabel, UiRunnerDestination } from "@/types/runner";
import type { CalculatedStats, PlayerStats } from "@/types/stats";

export function StatsEntrySection() {
  const activeTeam = useActiveTeam();
  const gameState = useFirstGameState();

  if (!activeTeam) {
    return <TeamSetupGate title="Create your team before entering stats." />;
  }

  if (gameState.status === "PREGAME" || !gameState.lineup.length) {
    return <PregameStatsEntryPrompt teamName={activeTeam.name} />;
  }

  if (gameState.status === "FINAL") {
    return <EndGameSummary gameState={gameState} teamName={activeTeam.name} onReset={resetFirstGameState} />;
  }

  return <LiveStatsEntry gameState={gameState} teamName={activeTeam.name} />;
}

function LiveStatsEntry({ gameState, teamName }: { gameState: GameState; teamName: string }) {
  const [selectedResult, setSelectedResult] = useState<BatterResult | null>(null);
  const [selectedOutType, setSelectedOutType] = useState<OutType | undefined>();
  const [isOutTypeModalOpen, setIsOutTypeModalOpen] = useState(false);
  const [movements, setMovements] = useState<MovementSelections>({});
  const [rbiCredit, setRbiCredit] = useState(false);
  const [pinchRunners, setPinchRunners] = useState<PinchRunnerSelections>({});
  const [pinchBase, setPinchBase] = useState<BaseLabel | null>(null);

  const batter = getCurrentBatter(gameState);
  const occupiedBases = occupiedBaseEntries(gameState.bases);
  const defaultMovements = useMemo(
    () => (selectedResult ? createDefaultMovements(selectedResult, gameState.bases) : {}),
    [gameState.bases, selectedResult],
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
        ? previewPlay(gameState, selectedResult, effectiveMovements, pinchRunners, rbiCredit, selectedOutType)
        : null,
    [effectiveMovements, gameState, pinchRunners, rbiCredit, selectedOutType, selectedResult],
  );
  const batterGameStats = getPlayerGameStats(gameState, batter.id);
  const batterStats = calculateStats(batterGameStats);
  const batterSeasonStats = calculateStats(getPlayerSeasonStats(batter, gameState));
  const lastResultByBatter = useMemo(() => {
    const results = new Map<string, BatterResult>();

    gameState.plays.forEach((play) => {
      results.set(play.batterId, play.result);
    });

    return results;
  }, [gameState.plays]);
  const hasRuns = Boolean(preview && preview.runs > 0);
  const previewRuns = preview?.runs ?? 0;
  const previewOuts = preview?.projectedOuts ?? gameState.outs;
  const previewRbis = preview?.rbis ?? 0;
  const previewSummary = preview?.summary ?? "Tap a batter result to preview runner movement, runs, outs, and RBI.";
  const playValidationError = selectedResult
    ? getPlayValidationError(gameState, selectedResult, effectiveMovements, pinchRunners, selectedOutType)
    : null;
  const pinchRunnerOptions = gameState.lineup.filter((player) => {
    const occupiedIds = new Set(occupiedBases.map(([, runner]) => runner.playerId));
    const selectedPinchRunnerIds = new Set(Object.values(pinchRunners).map((runner) => runner.playerId));
    return player.id !== batter.id && !occupiedIds.has(player.id) && !selectedPinchRunnerIds.has(player.id);
  });

  function selectResult(result: BatterResult) {
    if (getResultLockReason(result, gameState.bases, gameState.outs)) {
      return;
    }

    if (result === "Out") {
      setIsOutTypeModalOpen(true);
      return;
    }

    chooseResult(result);
  }

  function chooseResult(result: BatterResult, outType?: OutType) {
    const nextMovements = createDefaultMovements(result, gameState.bases);
    const nextPreview = previewPlay(gameState, result, nextMovements, pinchRunners, false, outType);

    setSelectedResult(result);
    setSelectedOutType(result === "Out" ? outType : undefined);
    setMovements(nextMovements);
    setRbiCredit(defaultRbiCredit(result, gameState.bases, nextPreview.runs));
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

  function persistNextState(nextState: GameState) {
    saveFirstGameState(nextState);
  }

  function saveCurrentPlay() {
    if (!selectedResult) {
      return;
    }

    if (selectedResult === "Out" && !selectedOutType) {
      setIsOutTypeModalOpen(true);
      return;
    }

    if (playValidationError) {
      return;
    }

    const nextState = savePlay(gameState, selectedResult, effectiveMovements, pinchRunners, rbiCredit, selectedOutType);

    persistNextState(nextState);
    setSelectedResult(null);
    setSelectedOutType(undefined);
    setIsOutTypeModalOpen(false);
    setMovements({});
    setPinchRunners({});
    setRbiCredit(false);
  }

  function undo() {
    const previous = undoLastPlay(gameState);

    persistNextState(previous);
    setSelectedResult(null);
    setSelectedOutType(undefined);
    setIsOutTypeModalOpen(false);
    setMovements({});
    setPinchRunners({});
    setRbiCredit(false);
  }

  function endCurrentGame() {
    persistNextState(endGame(gameState, undefined, teamName));
    setSelectedResult(null);
    setSelectedOutType(undefined);
    setIsOutTypeModalOpen(false);
    setMovements({});
    setPinchRunners({});
    setRbiCredit(false);
    setPinchBase(null);
  }

  return (
    <section className="min-h-screen bg-background pb-28 pt-3 sm:pb-32">
      <div className="mx-auto flex w-full max-w-md flex-col gap-3 px-3">
        <header className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
                Stats Entry
              </p>
              <h1 className="mt-1 text-xl font-semibold text-foreground sm:text-2xl">
                {gameState.half} {ordinalInning(gameState.inning)} | {formatOuts(gameState.outs)} | Us{" "}
                {gameState.teamScore} - Them {gameState.opponentScore}
              </h1>
            </div>
            <button
              className="inline-flex min-h-9 shrink-0 items-center gap-2 rounded-lg border border-[var(--danger)]/25 bg-[var(--danger-soft)] px-3 text-xs font-bold text-[var(--danger)]"
              onClick={endCurrentGame}
              type="button"
            >
              <Flag className="size-4" aria-hidden="true" />
              End
            </button>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
            <div className="rounded-md bg-[var(--surface)] px-3 py-2">
              <p className="text-xs font-bold text-[var(--muted-foreground)]">Batter</p>
              <p className="mt-1 truncate font-semibold text-foreground">{batter.name.split(" ")[0]}</p>
            </div>
            <div className="rounded-md bg-[var(--surface)] px-3 py-2">
              <p className="text-xs font-bold text-[var(--muted-foreground)]">Bases</p>
              <p className="mt-1 truncate font-semibold text-foreground">{formatBaseState(occupiedBases.map(([base]) => base))}</p>
            </div>
            <div className="rounded-md bg-[var(--surface)] px-3 py-2">
              <p className="text-xs font-bold text-[var(--muted-foreground)]">Runs</p>
              <p className="mt-1 font-semibold text-foreground">+{previewRuns}</p>
            </div>
          </div>
        </header>

        <nav
          aria-label="Batting order"
          className="-mx-3 overflow-x-auto border-y border-[var(--border)] bg-[var(--card)] px-3 py-2 sm:mx-0 sm:rounded-lg sm:border"
        >
          <div className="flex min-w-max gap-2">
            {gameState.lineup.map((player, index) => {
              const isCurrent = index === gameState.currentBatterIndex;
              const lastResult = lastResultByBatter.get(player.id);

              return (
                <button
                  className={cn(
                    "grid min-h-12 min-w-20 content-center rounded-lg px-3 text-left text-sm font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]",
                    isCurrent
                      ? "bg-[var(--amber)] text-[var(--foreground)]"
                      : "bg-[var(--surface)] text-foreground",
                  )}
                  key={player.id}
                  onClick={() => saveFirstGameState({ ...gameState, currentBatterIndex: index })}
                  type="button"
                >
                  <span>{index + 1}. {player.name.split(" ")[0]}</span>
                  <span className={cn("mt-0.5 text-[0.68rem]", isCurrent ? "text-[var(--foreground)] opacity-75" : "text-[var(--muted-foreground)]")}>
                    {isCurrent ? "At bat" : lastResult ?? "Ready"}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>

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
            <StatusPill tone="ready">#{gameState.currentBatterIndex + 1}</StatusPill>
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

        <article className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
            Batter result
          </p>
          <div className="mt-3 grid grid-cols-5 gap-2">
            {batterResults.map((result) => {
              const lockReason = getResultLockReason(result, gameState.bases, gameState.outs);

              return (
                <ResultButton
                  disabled={Boolean(lockReason)}
                  key={result}
                  label={result}
                  lockReason={lockReason ?? undefined}
                  onClick={() => selectResult(result)}
                  selected={result === selectedResult}
                />
              );
            })}
          </div>
        </article>

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
              occupiedBases.map(([base, runner]) => {
                const displayedRunner = pinchRunners[base] ?? runner;

                return (
                  <div className="rounded-lg bg-[var(--surface)] p-3" key={base}>
                    <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-start">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {base}: {displayedRunner.name}
                        </p>
                        {pinchRunners[base] ? (
                          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                            Pinch running for {runner.name}
                          </p>
                        ) : (
                          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                            Original runner
                          </p>
                        )}
                      </div>
                      <select
                        className="min-h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 text-sm font-bold text-foreground outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] sm:w-40"
                        onChange={(event) => changeMovement(base, event.target.value as UiRunnerDestination)}
                        value={effectiveMovements[base] ?? base}
                      >
                        {destinationOptions[base].map((destination) => (
                          <option key={destination} value={destination}>
                            {destinationLabel[destination]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-[var(--card)] px-3 text-xs font-bold text-[var(--accent)]"
                        onClick={() => setPinchBase(base)}
                        type="button"
                      >
                        <UserPlus className="size-4" aria-hidden="true" />
                        {pinchRunners[base] ? "Change" : "Use Pinch Runner"}
                      </button>
                      {pinchRunners[base] ? (
                        <button
                          className="inline-flex min-h-9 items-center rounded-lg bg-[var(--danger-soft)] px-3 text-xs font-bold text-[var(--danger)]"
                          onClick={() =>
                            setPinchRunners((current) => {
                              const next = { ...current };
                              delete next[base];
                              return next;
                            })
                          }
                          type="button"
                        >
                          Remove Pinch Runner
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-lg bg-[var(--surface)] p-4 text-sm font-semibold text-[var(--muted-foreground)]">
                Bases empty
              </div>
            )}
          </div>
        </article>

        {hasRuns ? (
          <article className="rounded-lg border border-[var(--accent)]/20 bg-[var(--accent-soft)] p-3">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--accent)]">
              RBI controls
            </p>
            <div className="mt-2 grid gap-3 sm:grid-cols-[1fr_12rem] sm:items-center">
              <p className="text-sm font-semibold text-[var(--accent-strong)]">
                {previewRuns} run{previewRuns === 1 ? "" : "s"} scored. Credit RBI to {batter.name.split(" ")[0]}?
              </p>
              <div className="grid grid-cols-2 gap-2 text-center text-sm font-bold">
                <button
                  className={cn(
                    "min-h-11 rounded-lg px-3",
                    rbiCredit ? "bg-[var(--accent)] text-white" : "bg-[var(--card)] text-foreground",
                  )}
                  onClick={() => setRbiCredit(true)}
                  type="button"
                >
                  Yes
                </button>
                <button
                  className={cn(
                    "min-h-11 rounded-lg px-3",
                    !rbiCredit ? "bg-[var(--accent)] text-white" : "bg-[var(--card)] text-foreground",
                  )}
                  onClick={() => setRbiCredit(false)}
                  type="button"
                >
                  No
                </button>
              </div>
            </div>
          </article>
        ) : null}

        <article className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
            After-play summary
          </p>
          <p className="mt-2 text-sm font-semibold text-foreground">{previewSummary}</p>
          {playValidationError ? (
            <p className="mt-2 rounded-md bg-[var(--danger-soft)] px-3 py-2 text-xs font-bold text-[var(--danger)]">
              {playValidationError}
            </p>
          ) : null}
          <div className="mt-3 grid grid-cols-3 gap-2">
            <SummaryTile label="Runs" value={`+${previewRuns}`} />
            <SummaryTile label="Outs" value={previewOuts} />
            <SummaryTile label="RBI" value={rbiCredit ? previewRbis : 0} />
          </div>
          <p className="mt-3 text-xs font-bold text-[var(--accent)]">
            Last saved: {gameState.lastSummary}
          </p>
        </article>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--border)] bg-[var(--card)]/95 px-3 py-3 shadow-2xl shadow-foreground/10 backdrop-blur">
        <div className="mx-auto grid w-full max-w-md grid-cols-[0.72fr_1.28fr] gap-2">
          <button
            className="flex min-h-12 items-center justify-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] text-sm font-bold text-foreground disabled:opacity-40"
            disabled={!gameState.history.length}
            onClick={undo}
            type="button"
          >
            <RotateCcw className="size-4" aria-hidden="true" />
            Undo
          </button>
          <button
            className="flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-3 text-sm font-bold text-white shadow-sm shadow-[var(--accent)]/20 disabled:opacity-45"
            disabled={!selectedResult || Boolean(playValidationError)}
            onClick={saveCurrentPlay}
            type="button"
          >
            <Save className="size-4" aria-hidden="true" />
            Save Play + Next Batter
          </button>
        </div>
      </div>

      <OutTypeModal
        isOpen={isOutTypeModalOpen}
        onClose={() => setIsOutTypeModalOpen(false)}
        onSelect={selectOutType}
      />

      {pinchBase ? (
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
              <button
                className="flex size-10 items-center justify-center rounded-lg bg-[var(--surface)] text-foreground"
                onClick={() => setPinchBase(null)}
                type="button"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>
            <div className="mt-4 grid gap-2">
              {pinchRunnerOptions.map((player) => {
                const originalRunner = gameState.bases[baseToKey(pinchBase)];

                return (
                  <button
                    className="min-h-11 rounded-lg bg-[var(--surface)] px-3 text-left text-sm font-bold text-foreground hover:bg-[var(--accent-soft)]"
                    key={player.id}
                    onClick={() => {
                      setPinchRunners((current) => ({
                        ...current,
                        [pinchBase]: {
                          ...runnerSlotFromPlayer(player),
                          originalPlayerId: originalRunner?.playerId,
                          originalName: originalRunner?.name,
                        },
                      }));
                      setPinchBase(null);
                    }}
                    type="button"
                  >
                    {player.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
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
              className="mt-auto flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[var(--accent)] text-sm font-bold text-white shadow-sm shadow-[var(--accent)]/20"
              onClick={finishGame}
              type="button"
            >
              {onReset ? <Save className="size-4" aria-hidden="true" /> : null}
              {finishLabel}
              <ArrowRight className="size-4" aria-hidden="true" />
            </button>

            {onReset ? (
              <button
                className="mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] text-sm font-bold text-[var(--muted-foreground)]"
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
                <p className="mt-1 text-xs font-bold text-[var(--muted-foreground)]">
                  {game.playCount} play{game.playCount === 1 ? "" : "s"} saved
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

function PregameStatsEntryPrompt({ teamName }: { teamName: string }) {
  return (
    <section className="bg-background py-6 sm:py-8">
      <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 lg:px-8">
        <ScreenHeader
          description="Pick today's players in Game Setup, generate the lineup, let the coach approve it, then start the game to unlock live scoring."
          eyebrow="Stats entry"
          icon={BarChart3}
          status="Pregame"
          title={`Start ${teamName} from the approved lineup.`}
        />
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Link
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[var(--surface)] px-4 text-sm font-bold text-foreground"
            href="/game-setup"
          >
            Game Setup
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
          <Link
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-4 text-sm font-bold text-white"
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

function ordinalInning(inning: number) {
  const modTen = inning % 10;
  const modHundred = inning % 100;

  if (modTen === 1 && modHundred !== 11) return `${inning}st`;
  if (modTen === 2 && modHundred !== 12) return `${inning}nd`;
  if (modTen === 3 && modHundred !== 13) return `${inning}rd`;
  return `${inning}th`;
}

function formatOuts(outs: number) {
  return `${outs} Out${outs === 1 ? "" : "s"}`;
}

function formatBaseState(bases: BaseLabel[]) {
  return bases.length ? bases.join(" ") : "Empty";
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
