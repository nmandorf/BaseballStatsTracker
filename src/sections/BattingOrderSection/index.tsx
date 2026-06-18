"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  CheckCircle2,
  GripVertical,
  Medal,
  MoveDown,
  Play,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { DefensiveAlignmentEditor } from "@/components/DefensiveAlignmentEditor";
import { StatTile } from "@/components/StatTile";
import { StatusPill } from "@/components/StatusPill";
import { TeamSetupGate } from "@/components/TeamSetupGate";
import { createInitialGameState, getLiveGameHref, initializeStartingDefense } from "@/lib/gameEngine";
import { createDefaultDefensiveAlignment, getDefensiveAlignmentIssues, getFirstDefensiveHalf } from "@/lib/defenseEngine";
import { saveFirstGameState } from "@/lib/firstGameStorage";
import { recommendBattingOrder, validateLineupGenderRules, validateLineupPlayerPool, type RecommendedLineupRow } from "@/lib/lineupRules";
import {
  buildPregamePlayerPool,
  generateLineupIds,
  resolveSuggestedLineupIds,
  savePregameSetup,
  usePregameSetup,
} from "@/lib/pregameSetupStorage";
import { useActiveTeam } from "@/lib/teamStorage";
import { useFirstGameState } from "@/lib/useFirstGameState";
import type { DefensiveAlignment } from "@/types/defense";

const priorities = ["OBP", "Out rate", "SLG", "OPS", "XBH%", "Speed bonus"];

export function BattingOrderSection() {
  const router = useRouter();
  const activeTeam = useActiveTeam();
  const setup = usePregameSetup();
  const firstGameState = useFirstGameState();
  const [manualOrderIds, setManualOrderIds] = useState<string[] | null>(null);
  const [startingDefense, setStartingDefense] = useState<DefensiveAlignment | null>(null);

  const suggestedLineup = resolveSuggestedLineupIds(setup, firstGameState, activeTeam);
  const generatedLineupIds = suggestedLineup.lineupIds;
  const playerPoolValidation = validateLineupPlayerPool(buildPregamePlayerPool(setup, firstGameState, activeTeam));
  const recommendedRowsById = new Map(
    recommendBattingOrder(buildPregamePlayerPool(setup, firstGameState, activeTeam)).map((row) => [row.player.id, row]),
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
  const firstDefensiveHalf = getFirstDefensiveHalf(setup.isHome);
  const defenseAlignment = resolveStartingDefenseAlignment(lineupPlayers, startingDefense, firstDefensiveHalf);
  const defenseIssues = defenseAlignment
    ? getDefensiveAlignmentIssues(defenseAlignment, lineupPlayers)
    : [];
  const [selectedPriority, setSelectedPriority] = useState("OBP");
  const lineupValidation = validateLineupGenderRules(lineup.map((row) => row.player));
  const acceptedMatchesLineup =
    lineup.length > 0 &&
    setup.acceptedLineupIds.length === lineup.length &&
    setup.acceptedLineupIds.every((playerId, index) => playerId === lineup[index]?.player.id);
  const canStartGame = acceptedMatchesLineup
    && lineupValidation.isLeagueCompliant
    && defenseIssues.length === 0;
  const lineupWarnings = [
    ...suggestedLineup.warnings,
    ...playerPoolValidation.warnings,
    ...(lineup.length ? lineupValidation.warnings : []),
  ].filter((warning, index, warnings) => warnings.indexOf(warning) === index);

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

    const nextGeneratedLineupIds = generateLineupIds(setup, firstGameState, activeTeam);

    setManualOrderIds(null);
    savePregameSetup({
      ...setup,
      generatedLineupIds: nextGeneratedLineupIds,
      acceptedLineupIds: [],
      status: "GENERATED",
    });
  }

  function acceptLineup() {
    if (!lineupValidation.isLeagueCompliant) {
      return;
    }

    savePregameSetup({
      ...setup,
      generatedLineupIds: lineup.map((row) => row.player.id),
      acceptedLineupIds: lineup.map((row) => row.player.id),
      status: "ACCEPTED",
    });
  }

  function startGame() {
    if (!canStartGame) {
      return;
    }

    const players = setup.acceptedLineupIds
      .map((playerId) => lineup.find((row) => row.player.id === playerId)?.player)
      .filter((player): player is RecommendedLineupRow["player"] => Boolean(player));

    if (!players.length) {
      return;
    }

    const initialState = createInitialGameState(players, {
      opponent: setup.opponent || "Opponent",
      isHome: setup.isHome,
      gameRules: setup.gameRules,
      status: "IN_PROGRESS",
    });
    const gameStateWithDefense = initializeStartingDefense(
      initialState,
      defenseAlignment ?? createDefaultDefensiveAlignment(players, firstDefensiveHalf.inning, firstDefensiveHalf.half),
    );

    saveFirstGameState(gameStateWithDefense);
    savePregameSetup({
      ...setup,
      generatedLineupIds: players.map((player) => player.id),
      acceptedLineupIds: players.map((player) => player.id),
      status: "STARTED",
    });
    router.push(getLiveGameHref(gameStateWithDefense));
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
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[var(--surface)] px-3 text-sm font-bold text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!playerPoolValidation.isLeagueCompliant}
                onClick={generateLatestLineup}
                type="button"
              >
                <Sparkles className="size-4" aria-hidden="true" />
                Generate
              </button>
              <button
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[var(--surface)] px-3 text-sm font-bold text-foreground"
                onClick={() => setManualOrderIds(null)}
                type="button"
              >
                <RotateCcw className="size-4" aria-hidden="true" />
                Reset
              </button>
              <button
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[var(--success-soft)] px-3 text-sm font-bold text-[var(--success)] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!lineup.length || !lineupValidation.isLeagueCompliant}
                onClick={acceptLineup}
                type="button"
              >
                <CheckCircle2 className="size-4" aria-hidden="true" />
                Accept
              </button>
              <button
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!canStartGame}
                onClick={startGame}
                type="button"
              >
                <Play className="size-4" aria-hidden="true" />
                Start Game
              </button>
            </div>
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
                        className="flex size-9 items-center justify-center rounded-lg bg-[var(--card)] text-[var(--accent)] disabled:opacity-30"
                        disabled={index === 0}
                        onClick={() => movePlayer(index, -1)}
                        type="button"
                      >
                        <ArrowUp className="size-4" aria-hidden="true" />
                      </button>
                      <button
                        aria-label={`Move ${row.player.name} down`}
                        className="flex size-9 items-center justify-center rounded-lg bg-[var(--card)] text-[var(--accent)] disabled:opacity-30"
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
                    className="mt-3 inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--accent)] px-4 text-sm font-bold text-white"
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
                {canStartGame ? "Ready" : defenseIssues.length ? "Fix defense" : "Accept order first"}
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
                <DefensiveAlignmentEditor
                  alignment={defenseAlignment}
                  players={lineupPlayers}
                  onChange={setStartingDefense}
                />
              ) : (
                <p className="rounded-lg bg-[var(--surface)] p-3 text-sm font-bold text-[var(--muted-foreground)]">
                  Generate a batting order to set the defense.
                </p>
              )}
            </div>
          </article>

          <article className="order-5 rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm shadow-foreground/[0.035]">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
              Ranking priorities
            </p>
            <h2 className="mt-1 text-lg font-semibold text-foreground">
              Tap a priority to focus review
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
              The priority chips update the review context only. They do not
              calculate a new lineup yet.
            </p>
            <div className="mt-4 grid gap-2">
              {priorities.map((priority, index) => (
                <button
                  className={
                    selectedPriority === priority
                      ? "flex min-h-11 items-center gap-3 rounded-lg bg-[var(--accent)] px-3 text-left text-sm font-semibold text-white"
                      : "flex min-h-11 items-center gap-3 rounded-lg bg-[var(--surface)] px-3 text-left text-sm font-semibold text-foreground"
                  }
                  key={priority}
                  onClick={() => setSelectedPriority(priority)}
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
