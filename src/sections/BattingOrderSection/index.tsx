"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  CheckCircle2,
  Download,
  GripVertical,
  Medal,
  MoveDown,
  Play,
  RotateCcw,
  Save,
  Sparkles,
} from "lucide-react";
import { DefensiveAlignmentEditor } from "@/components/DefensiveAlignmentEditor";
import { StatTile } from "@/components/StatTile";
import { StatusPill } from "@/components/StatusPill";
import { TeamSetupGate } from "@/components/TeamSetupGate";
import { createDefensiveLineupPdf } from "@/lib/defensiveLineupPdf";
import { buildFullGameDefensiveLineupPlan } from "@/lib/defensiveLineupPlanner";
import { createInitialGameState, getLiveGameHref, initializeStartingDefense } from "@/lib/gameEngine";
import { createDefaultDefensiveAlignment, getDefensiveAlignmentIssues, getFirstDefensiveHalf } from "@/lib/defenseEngine";
import { saveFirstGameState } from "@/lib/firstGameStorage";
import {
  isLineupGenderOptimized,
  lineupRankingPriorities,
  recommendBattingOrder,
  validateLineupGenderRules,
  validateLineupPlayerPool,
  type LineupRankingPriority,
  type RecommendedLineupRow,
} from "@/lib/lineupRules";
import {
  buildAcceptedPregameSetup,
  buildPregamePlayerPool,
  generateLineupIds,
  flushPregameSetupSync,
  isStartingDefenseSavedForFirstFieldingHalf,
  resolveSuggestedLineupIds,
  resolveLineupPlayers,
  savePregameSetup,
  type PregameSetup,
  usePregameSetup,
} from "@/lib/pregameSetupStorage";
import { useBackendSyncedActiveTeam } from "@/lib/teamStorage";
import { getVerifiedTeamAccountHeaders } from "@/lib/teamStorage";
import { useTeamSchedule } from "@/lib/scheduleClient";
import { gameStartLeadTimeMs } from "@/lib/scheduleRules";
import { cn } from "@/lib/utils";
import type { DefensiveAlignment } from "@/types/defense";

export function BattingOrderSection() {
  const router = useRouter();
  const activeTeam = useBackendSyncedActiveTeam();
  const setup = usePregameSetup();
  const { schedule } = useTeamSchedule(activeTeam?.id ?? null);
  const [now, setNow] = useState(() => Date.now());
  const [startError, setStartError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [manualOrderIds, setManualOrderIds] = useState<string[] | null>(null);
  const [selectedPriority, setSelectedPriority] = useState<LineupRankingPriority>("OBP");
  const [priorityOverrideActive, setPriorityOverrideActive] = useState(false);
  const [draftStartingDefense, setDraftStartingDefense] = useState<{
    key: string;
    alignment: DefensiveAlignment;
  } | null>(null);

  const rankingOptions = { rankingPriority: selectedPriority };
  const pregamePlayerPool = buildPregamePlayerPool(setup, activeTeam);
  const suggestedLineup = resolveSuggestedLineupIds(setup, activeTeam, {
    ...rankingOptions,
    useSavedGeneratedLineup: !priorityOverrideActive,
  });
  const generatedLineupIds = suggestedLineup.lineupIds;
  const playerPoolValidation = validateLineupPlayerPool(pregamePlayerPool);
  const recommendedRowsById = new Map(
    recommendBattingOrder(pregamePlayerPool, rankingOptions).map((row) => [row.player.id, row]),
  );
  const recommendedLineup = generatedLineupIds
    .map((playerId) => recommendedRowsById.get(playerId))
    .filter((row): row is RecommendedLineupRow => Boolean(row));
  const rowsByPlayerId = new Map(recommendedLineup.map((row) => [row.player.id, row]));
  const lineup = manualOrderIds
    ? manualOrderIds
        .map((playerId) => rowsByPlayerId.get(playerId))
        .filter((row): row is RecommendedLineupRow => Boolean(row))
    : recommendedLineup;
  const lineupPlayers = lineup.map((row) => row.player);
  const lineupPlayerKey = lineupPlayers.map((player) => player.id).join("|");
  const firstDefensiveHalf = getFirstDefensiveHalf(setup.isHome);
  const defenseDraftKey = [
    setup.gameId ?? "unscheduled",
    firstDefensiveHalf.inning,
    firstDefensiveHalf.half,
    lineupPlayerKey,
  ].join("|");
  const currentDraftStartingDefense = draftStartingDefense?.key === defenseDraftKey
    ? draftStartingDefense.alignment
    : null;
  const savedDefenseAlignment = resolveStartingDefenseAlignment(lineupPlayers, setup.startingDefense, firstDefensiveHalf);
  const defenseAlignment = currentDraftStartingDefense ?? savedDefenseAlignment;
  const defenseIssues = defenseAlignment
    ? getDefensiveAlignmentIssues(defenseAlignment, lineupPlayers)
    : [];
  const startingDefenseSaved = isStartingDefenseSavedForFirstFieldingHalf(
    setup.startingDefense,
    defenseAlignment,
    firstDefensiveHalf,
  );
  const canBuildFullGameDefensePlan = Boolean(defenseAlignment) && defenseIssues.length === 0;
  const fullGameDefensePlan = canBuildFullGameDefensePlan && defenseAlignment
    ? buildFullGameDefensiveLineupPlan({
        players: lineupPlayers,
        firstInning: firstDefensiveHalf.inning,
        half: firstDefensiveHalf.half,
        startingAlignment: defenseAlignment,
      })
    : null;
  const lineupValidation = validateLineupGenderRules(lineup.map((row) => row.player));
  const lineupGenderOptimized = isLineupGenderOptimized(lineup.map((row) => row.player));
  const acceptedMatchesLineup =
    lineup.length > 0 &&
    setup.acceptedLineupIds.length === lineup.length &&
    setup.acceptedLineupIds.every((playerId, index) => playerId === lineup[index]?.player.id);
  const selectedScheduledGame = schedule?.weeks.find((week) => week.kind === "GAME" && week.gameId === setup.gameId);
  const startEligibleAt = selectedScheduledGame?.kind === "GAME" ? Date.parse(selectedScheduledGame.scheduledStartAt) - gameStartLeadTimeMs : Number.POSITIVE_INFINITY;
  const lineupReady = acceptedMatchesLineup
    && lineupValidation.isLeagueCompliant
    && lineupGenderOptimized
    && startingDefenseSaved
    && defenseIssues.length === 0;
  const fullGameDefenseEmptyReason = defenseIssues.length
    ? "Fix the starting defense to build the full-game grid."
    : "Generate a batting order to build the defensive grid.";
  const canStartGame = lineupReady && Boolean(selectedScheduledGame) && now >= startEligibleAt && !isStarting;
  const lineupWarnings = [
    ...suggestedLineup.warnings,
    ...playerPoolValidation.warnings,
    ...(lineup.length ? lineupValidation.warnings : []),
  ].filter((warning, index, warnings) => warnings.indexOf(warning) === index);
  const acceptIsPrimaryAction = !acceptedMatchesLineup;
  const startIsPrimaryAction = acceptedMatchesLineup;
  const startGameLabel = !selectedScheduledGame
    ? "Start Game"
    : now < startEligibleAt
      ? `Locked · ${formatStartCountdown(startEligibleAt - now)}`
      : "Start Game";
  const defenseStatusLabel = canStartGame
    ? "Ready"
    : defenseIssues.length
      ? "Fix defense"
      : startingDefenseSaved
        ? "Saved"
        : "Save defense";

  useEffect(() => {
    const clientBase = Date.now();
    const serverBase = schedule ? Date.parse(schedule.serverNow) : clientBase;
    const timer = window.setInterval(() => setNow(serverBase + Date.now() - clientBase), 1_000);
    return () => window.clearInterval(timer);
  }, [schedule]);

  if (!activeTeam) {
    return <TeamSetupGate title="Create your team before reviewing the batting order." />;
  }

  function movePlayer(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;

    if (nextIndex < 0 || nextIndex >= lineup.length) {
      return;
    }

    setManualOrderIds(() => {
      const copy = lineup.map((row) => row.player.id);
      [copy[index], copy[nextIndex]] = [copy[nextIndex], copy[index]];
      return copy;
    });
  }

  function generateLatestLineup() {
    if (!playerPoolValidation.isLeagueCompliant) {
      return;
    }

    const nextGeneratedLineupIds = generateLineupIds(setup, activeTeam, rankingOptions);

    setManualOrderIds(null);
    setPriorityOverrideActive(false);
    savePregameSetup({
      ...setup,
      generatedLineupIds: nextGeneratedLineupIds,
      acceptedLineupIds: [],
      startingDefense: null,
      status: "GENERATED",
    });
  }

  function selectRankingPriority(priority: LineupRankingPriority) {
    setSelectedPriority(priority);
    setPriorityOverrideActive(true);
    setManualOrderIds(null);
  }

  function acceptLineup() {
    if (!lineup.length || !lineupGenderOptimized) {
      return;
    }

    savePregameSetup({
      ...setup,
      generatedLineupIds: lineup.map((row) => row.player.id),
      acceptedLineupIds: lineup.map((row) => row.player.id),
      startingDefense: startingDefenseSaved ? defenseAlignment : null,
      status: "ACCEPTED",
    });
  }

  function saveStartingDefense() {
    if (!defenseAlignment || defenseIssues.length) {
      return;
    }

    savePregameSetup({
      ...setup,
      startingDefense: defenseAlignment,
    });
    setDraftStartingDefense(null);
  }

  async function startGame() {
    if (!canStartGame) {
      return;
    }

    const players = setup.acceptedLineupIds
      .map((playerId) => lineup.find((row) => row.player.id === playerId)?.player)
      .filter((player): player is RecommendedLineupRow["player"] => Boolean(player));

    if (!players.length) {
      return;
    }

    if (!setup.gameId) return;

    setIsStarting(true);
    setStartError(null);
    try {
      const startingDefenseForStart = defenseAlignment
        ?? createDefaultDefensiveAlignment(players, firstDefensiveHalf.inning, firstDefensiveHalf.half);
      const acceptedSetup = buildAcceptedPregameSetup(
        setup,
        players.map((player) => player.id),
        startingDefenseForStart,
      );
      await flushPregameSetupSync();
      const preparationResponse = await fetch(`/api/games/${encodeURIComponent(setup.gameId)}/preparation`, {
        method: "PUT",
        headers: await getVerifiedTeamAccountHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(acceptedSetup),
      });
      const preparationError = preparationResponse.ok
        ? null
        : await readApiErrorMessage(preparationResponse, "Unable to save the accepted lineup.");
      const startResponse = await fetch(`/api/games/${encodeURIComponent(setup.gameId)}/start`, {
        method: "POST",
        headers: await getVerifiedTeamAccountHeaders(),
      });
      if (!startResponse.ok) {
        const startErrorMessage = await readApiErrorMessage(startResponse, "Unable to start this game.");
        throw new Error(preparationError ? `${startErrorMessage} ${preparationError}` : startErrorMessage);
      }
      const startPayload = await startResponse.json() as { preparation?: PregameSetup };
      const startedSetup = startPayload.preparation ?? acceptedSetup;
      const startedLineupIds = startedSetup.acceptedLineupIds.length
        ? startedSetup.acceptedLineupIds
        : startedSetup.generatedLineupIds;
      const startedPlayers = resolveLineupPlayers(startedLineupIds, activeTeam);

      if (!startedPlayers.length) {
        throw new Error("Unable to load the started game's lineup.");
      }

      const initialState = createInitialGameState(startedPlayers, {
        gameId: setup.gameId,
        opponent: startedSetup.opponent || "Opponent",
        isHome: startedSetup.isHome,
        gameRules: startedSetup.gameRules,
        status: "IN_PROGRESS",
      });
      const gameStateWithDefense = initializeStartingDefense(
        initialState,
        startedSetup.startingDefense ?? startingDefenseForStart,
      );

      saveFirstGameState(gameStateWithDefense);
      savePregameSetup({
        ...startedSetup,
        generatedLineupIds: startedPlayers.map((player) => player.id),
        acceptedLineupIds: startedPlayers.map((player) => player.id),
        status: "STARTED",
      });
      router.push(getLiveGameHref(gameStateWithDefense));
    } catch (caught) {
      setStartError(caught instanceof Error ? caught.message : "Unable to start this game.");
    } finally {
      setIsStarting(false);
    }
  }

  function downloadDefensiveLineupPdf() {
    if (!fullGameDefensePlan) {
      return;
    }

    const pdf = createDefensiveLineupPdf(fullGameDefensePlan);
    const url = URL.createObjectURL(pdf);
    const link = document.createElement("a");

    link.href = url;
    link.download = "defensive-lineup.pdf";
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  return (
    <section className="bg-background py-6 sm:py-8">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <h1 className="sr-only">Batting order and starting defense</h1>
        <div className="grid gap-4 lg:grid-cols-[1.18fr_0.82fr]">
          <div className="order-3 grid gap-3 sm:grid-cols-3 lg:order-2 lg:col-span-2">
            <StatTile helper="Tap priority below" icon={BarChart3} label="Top metric" tone="accent" value={selectedPriority} />
            <StatTile helper={`Current #4: ${lineup[3]?.player.name.split(" ")[0] ?? "TBD"}`} icon={Medal} label="Power slot" tone="warning" value="#4" />
            <StatTile helper={`Current #10: ${lineup[9]?.player.name.split(" ")[0] ?? "TBD"}`} icon={MoveDown} label="Last spot" tone="success" value="Turn" />
          </div>

          <article className="order-1 min-w-0 rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm shadow-foreground/[0.035] lg:order-3 lg:col-span-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                  Suggested lineup
                </p>
                <h2 className="mt-1 text-lg font-semibold text-foreground">
                  Move hitters before coach approval
                </h2>
              </div>
              <StatusPill tone={acceptedMatchesLineup ? "done" : "review"}>
                {acceptedMatchesLineup ? "Done" : "Under Review"}
              </StatusPill>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-4">
              <button
                className="btn-base btn-secondary min-h-11 px-3 text-sm"
                disabled={!playerPoolValidation.isLeagueCompliant}
                onClick={generateLatestLineup}
                type="button"
              >
                <Sparkles className="size-4" aria-hidden="true" />
                Generate
              </button>
              <button
                className="btn-base btn-secondary min-h-11 px-3 text-sm"
                onClick={() => setManualOrderIds(null)}
                type="button"
              >
                <RotateCcw className="size-4" aria-hidden="true" />
                Reset
              </button>
              <button
                className={cn(
                  "btn-base min-h-11 px-3 text-sm",
                  acceptIsPrimaryAction ? "btn-primary" : "btn-secondary",
                )}
                disabled={!lineup.length || !lineupGenderOptimized}
                onClick={acceptLineup}
                type="button"
              >
                <CheckCircle2 className="size-4" aria-hidden="true" />
                Accept
              </button>
              <button
                className={cn(
                  "btn-base min-h-11 px-3 text-sm",
                  startIsPrimaryAction ? "btn-primary" : "btn-secondary",
                )}
                disabled={!canStartGame}
                onClick={startGame}
                type="button"
              >
                <Play className="size-4" aria-hidden="true" />
                {isStarting ? "Starting…" : startGameLabel}
              </button>
            </div>
            {!selectedScheduledGame ? (
              <Link
                className="btn-base btn-secondary mt-3 min-h-11 px-4 text-sm"
                href="/game-setup"
              >
                Select Scheduled Game
              </Link>
            ) : null}
            {startError ? <p className="mt-3 rounded-lg bg-[var(--danger-soft)] px-3 py-2 text-sm font-bold text-[var(--danger)]">{startError}</p> : null}
            {lineupWarnings
              .map((warning) => (
                <p
                  className="mt-3 rounded-lg bg-[var(--danger-soft)] px-3 py-2 text-sm font-bold text-[var(--danger)]"
                  key={warning}
                >
                  {warning}
                </p>
              ))}
            <div className="mt-4 space-y-2">
              {lineup.length ? (
                lineup.map((row, index) => (
                  <div
                    className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-lg bg-[var(--surface)] px-3 py-2.5"
                    key={row.player.id}
                  >
                    <span className="flex size-9 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-bold text-white">
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {row.player.name}
                      </p>
                      <p className="truncate text-xs text-[var(--muted-foreground)]">
                        {row.role} - {row.player.gender}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="hidden rounded-full bg-[var(--card)] px-2.5 py-1 text-xs font-bold text-[var(--accent)] sm:inline-flex">
                        {row.signal}
                      </span>
                      <button
                        aria-label={`Move ${row.player.name} up`}
                        className="btn-base btn-secondary size-9 min-h-0 p-0 text-[var(--accent)]"
                        disabled={index === 0}
                        onClick={() => movePlayer(index, -1)}
                        type="button"
                      >
                        <ArrowUp className="size-4" aria-hidden="true" />
                      </button>
                      <button
                        aria-label={`Move ${row.player.name} down`}
                        className="btn-base btn-secondary size-9 min-h-0 p-0 text-[var(--accent)]"
                        disabled={index === lineup.length - 1}
                        onClick={() => movePlayer(index, 1)}
                        type="button"
                      >
                        <ArrowDown className="size-4" aria-hidden="true" />
                      </button>
                      <GripVertical className="size-4 text-[var(--muted-foreground)]" />
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-lg bg-[var(--surface)] p-4">
                  <p className="text-sm font-bold text-foreground">
                    {suggestedLineup.emptyReason ?? "No suggested lineup is available yet."}
                  </p>
                  <Link
                    className="btn-base btn-primary mt-3 min-h-11 px-4 text-sm"
                    href="/game-setup"
                  >
                    Open Game Setup
                  </Link>
                </div>
              )}
            </div>
          </article>

          <article className="order-4 rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm shadow-foreground/[0.035] lg:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                  Starting defense
                </p>
                <h2 className="mt-1 text-lg font-semibold text-foreground">
                  {firstDefensiveHalf.half} {firstDefensiveHalf.inning}
                </h2>
              </div>
              <StatusPill tone={canStartGame ? "ready" : "review"}>
                {defenseStatusLabel}
              </StatusPill>
            </div>
            <div className="mt-4">
              {defenseIssues.map((issue) => (
                <p
                  className="mb-3 rounded-lg bg-[var(--danger-soft)] px-3 py-2 text-sm font-bold text-[var(--danger)]"
                  key={issue.code}
                  role="alert"
                >
                  {issue.message}
                </p>
              ))}
              {defenseAlignment ? (
                <div className="grid gap-3">
                  <button
                    className="btn-base btn-secondary min-h-11 px-4 text-sm sm:w-fit"
                    disabled={defenseIssues.length > 0}
                    onClick={saveStartingDefense}
                    type="button"
                  >
                    <Save className="size-4" aria-hidden="true" />
                    Save Defense
                  </button>
                  {startingDefenseSaved ? (
                    <p className="rounded-lg bg-[var(--success-soft)] px-3 py-2 text-sm font-bold text-[var(--success)]">
                      Starting defense saved.
                    </p>
                  ) : null}
                  <DefensiveAlignmentEditor
                    alignment={defenseAlignment}
                    players={lineupPlayers}
                    onChange={(alignment) => setDraftStartingDefense({ key: defenseDraftKey, alignment })}
                  />
                </div>
              ) : (
                <p className="rounded-lg bg-[var(--surface)] p-3 text-sm font-bold text-[var(--muted-foreground)]">
                  Generate a batting order to set the defense.
                </p>
              )}
            </div>
          </article>

          <article className="order-5 min-w-0 rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm shadow-foreground/[0.035] lg:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                  Full-game defense
                </p>
                <h2 className="mt-1 text-lg font-semibold text-foreground">
                  7-inning lineup grid
                </h2>
              </div>
              <button
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!fullGameDefensePlan}
                onClick={downloadDefensiveLineupPdf}
                type="button"
              >
                <Download className="size-4" aria-hidden="true" />
                PDF
              </button>
            </div>
            {fullGameDefensePlan?.warnings.map((warning) => (
              <p
                className="mt-3 rounded-lg bg-[var(--warning-soft)] px-3 py-2 text-sm font-bold text-[var(--warning)]"
                key={warning}
              >
                {warning}
              </p>
            ))}
            <div className="mt-4 overflow-x-auto rounded-lg border border-[var(--border)]">
              {fullGameDefensePlan ? (
                <table className="w-full min-w-[760px] border-collapse text-sm">
                  <thead>
                    <tr className="bg-[#172033] text-white">
                      <th className="min-w-48 border-r border-white/30 px-3 py-3 text-left font-bold">
                        Batting Order
                      </th>
                      {fullGameDefensePlan.innings.map((inning) => (
                        <th className="border-r border-white/30 px-3 py-3 text-center font-bold last:border-r-0" key={inning}>
                          Inn {inning}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {fullGameDefensePlan.rows.map((row) => (
                      <tr className="odd:bg-white even:bg-[var(--surface)]" key={row.playerId}>
                        <th className="border-r border-t border-[var(--border)] bg-[var(--surface)] px-3 py-3 text-left font-bold text-foreground">
                          {row.battingOrderPosition}. {row.playerName}
                        </th>
                        {row.cells.map((cell) => (
                          <td
                            className={
                              cell.isBench
                                ? "border-r border-t border-[var(--border)] bg-[#f2c66d] px-3 py-3 text-center font-black text-[#5b3a00] last:border-r-0"
                                : "border-r border-t border-[var(--border)] px-3 py-3 text-center font-bold text-foreground last:border-r-0"
                            }
                            key={`${row.playerId}-${cell.inning}`}
                          >
                            {cell.value}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="bg-[var(--surface)] p-4 text-sm font-bold text-[var(--muted-foreground)]">
                  {fullGameDefenseEmptyReason}
                </p>
              )}
            </div>
          </article>

          <article className="order-6 min-w-0 rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm shadow-foreground/[0.035] lg:col-span-2">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
              Ranking priorities
            </p>
            <h2 className="mt-1 text-lg font-semibold text-foreground">
              Tap a priority to focus review
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
              The priority chips recalculate the recommendation for the
              selected players before coach approval.
            </p>
            <div className="mt-4 grid gap-2">
              {lineupRankingPriorities.map((priority, index) => (
                <button
                  className={
                    selectedPriority === priority
                      ? "btn-base btn-choice-selected min-h-11 w-full justify-start gap-3 px-3 text-left text-sm font-semibold"
                      : "btn-base btn-choice min-h-11 w-full justify-start gap-3 px-3 text-left text-sm font-semibold"
                  }
                  aria-pressed={selectedPriority === priority}
                  key={priority}
                  onClick={() => selectRankingPriority(priority)}
                  type="button"
                >
                  <span className="flex size-7 items-center justify-center rounded-full bg-[var(--card)] text-xs font-bold text-[var(--accent)]">
                    {index + 1}
                  </span>
                  {priority}
                </button>
              ))}
            </div>
            <div className="mt-4 rounded-lg bg-[var(--accent-soft)] p-3 text-sm font-semibold text-[var(--accent-strong)]">
              Current focus: {selectedPriority}. Use the row arrows to adjust
              the local order before opening stats entry.
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

function resolveStartingDefenseAlignment(
  lineupPlayers: RecommendedLineupRow["player"][],
  startingDefense: DefensiveAlignment | null,
  firstDefensiveHalf: ReturnType<typeof getFirstDefensiveHalf>,
) {
  if (!lineupPlayers.length) {
    return null;
  }

  if (!startingDefense) {
    return createDefaultDefensiveAlignment(lineupPlayers, firstDefensiveHalf.inning, firstDefensiveHalf.half);
  }

  if (startingDefense.inning !== firstDefensiveHalf.inning || startingDefense.half !== firstDefensiveHalf.half) {
    return createDefaultDefensiveAlignment(lineupPlayers, firstDefensiveHalf.inning, firstDefensiveHalf.half);
  }

  const activeLineupIds = new Set(lineupPlayers.map((player) => player.id));
  const defenseUsesCurrentLineup = Object.values(startingDefense.slots).every((slot) => (
    !slot ||
    slot.status === "VACANT" ||
    activeLineupIds.has(slot.playerId)
  ));

  return defenseUsesCurrentLineup
    ? startingDefense
    : createDefaultDefensiveAlignment(lineupPlayers, firstDefensiveHalf.inning, firstDefensiveHalf.half);
}

function formatStartCountdown(milliseconds: number) {
  const totalMinutes = Math.max(0, Math.ceil(milliseconds / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours ? `${hours}h ${minutes}m` : `${minutes}m`;
}

async function readApiErrorMessage(response: Response, fallback: string) {
  try {
    const payload = await response.json() as { error?: { message?: string } };
    return payload.error?.message ?? `${fallback} (${response.status})`;
  } catch {
    return `${fallback} (${response.status})`;
  }
}
