"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { ArrowRight, CalendarDays, Check, Home, Settings2, Sparkles, UsersRound } from "lucide-react";
import { StatTile } from "@/components/StatTile";
import { StatusPill } from "@/components/StatusPill";
import { TeamSetupGate } from "@/components/TeamSetupGate";
import {
  buildPregamePlayerPool,
  generateLineupIds,
  getLineupTargetCount,
  resolveSuggestedLineupIds,
  savePregameSetup,
  selectScheduledGameForPregame,
  usePregameSetup,
  type LineupSizeOption,
} from "@/lib/pregameSetupStorage";
import { validateLineupPlayerPool } from "@/lib/lineupRules";
import { useActiveTeam } from "@/lib/teamStorage";
import { useTeamSchedule } from "@/lib/scheduleClient";
import { useFirstGameState } from "@/lib/useFirstGameState";
import { cn } from "@/lib/utils";
import type { GameRules } from "@/types/game";
import type { ScheduleWeek } from "@/types/schedule";

export function GameSetupSection() {
  const activeTeam = useActiveTeam();
  const setup = usePregameSetup();
  const gameState = useFirstGameState();
  const { schedule, isLoading: isScheduleLoading } = useTeamSchedule(activeTeam?.id ?? null);
  const scheduledGames = (schedule?.weeks ?? []).filter(
    (week): week is Extract<ScheduleWeek, { kind: "GAME" }> => week.kind === "GAME" && week.status === "SCHEDULED",
  );
  const selectedGame = scheduledGames.find((game) => game.gameId === setup.gameId) ?? null;
  const lineupTarget = getLineupTargetCount(setup.lineupSize, setup.selectedPlayerIds.length);
  const players = activeTeam?.players.filter((player) => player.isActive) ?? [];
  const selectedPlayerPool = useMemo(
    () => buildPregamePlayerPool(setup, gameState, activeTeam),
    [activeTeam, gameState, setup],
  );
  const lineupValidation = validateLineupPlayerPool(selectedPlayerPool);
  const canGenerateLineup = setup.selectedPlayerIds.length > 0 && lineupValidation.isLeagueCompliant;
  const suggestedLineup = resolveSuggestedLineupIds(setup, gameState, activeTeam);
  const canReviewLineup = Boolean(suggestedLineup.lineupIds.length || suggestedLineup.canGenerate);

  useEffect(() => {
    if (!activeTeam || !scheduledGames.length || selectedGame) return;
    selectScheduledGameForPregame(activeTeam.id, scheduledGames[0], activeTeam);
  }, [activeTeam, scheduledGames, selectedGame]);

  if (!activeTeam) {
    return <TeamSetupGate title="Create your team before setting up a game." />;
  }

  function togglePlayer(playerId: string) {
    const selectedPlayerIds = setup.selectedPlayerIds.includes(playerId)
      ? setup.selectedPlayerIds.filter((id) => id !== playerId)
      : [...setup.selectedPlayerIds, playerId];

    savePregameSetup({
      ...setup,
      selectedPlayerIds,
      generatedLineupIds: [],
      acceptedLineupIds: [],
      startingDefense: null,
      status: "SETUP",
    });
  }

  function updateLineupSize(lineupSize: LineupSizeOption) {
    savePregameSetup({
      ...setup,
      lineupSize,
      generatedLineupIds: [],
      acceptedLineupIds: [],
      startingDefense: null,
      status: "SETUP",
    });
  }

  function generateLineup() {
    const generatedLineupIds = generateLineupIds(setup, gameState, activeTeam);

    savePregameSetup({
      ...setup,
      generatedLineupIds,
      acceptedLineupIds: [],
      status: "GENERATED",
    });
  }

  return (
    <section className="bg-background py-6 sm:py-8">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-3 sm:grid-cols-3">
          <StatTile helper="Opponent" icon={CalendarDays} label="Today" tone="accent" value={setup.opponent || "TBD"} />
          <StatTile helper={setup.isHome ? "Bat last" : "Bat first"} icon={Home} label="Side" value={setup.isHome ? "Home" : "Away"} />
          <StatTile helper={`${lineupTarget} in generated order`} icon={UsersRound} label="Active" tone="success" value={`${setup.selectedPlayerIds.length}/${players.length}`} />
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <article className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm shadow-foreground/[0.035]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                  Game details
                </p>
                <h2 className="mt-1 text-lg font-semibold text-foreground">
                  {selectedGame ? "Ready for lineup review" : "Choose an upcoming game"}
                </h2>
              </div>
              <StatusPill tone="planned">Local only</StatusPill>
            </div>

            <div className="mt-4 grid gap-3">
              <label className="grid gap-1 text-sm font-bold text-foreground">Scheduled game
                <select className="min-h-11 rounded-lg border border-[var(--border)] bg-background px-3" disabled={isScheduleLoading || !scheduledGames.length} onChange={(event) => { const game = scheduledGames.find((item) => item.gameId === event.target.value); if (game) selectScheduledGameForPregame(activeTeam.id, game, activeTeam); }} value={selectedGame?.gameId ?? ""}>
                  {!scheduledGames.length ? <option value="">No upcoming games</option> : null}
                  {scheduledGames.map((game) => <option key={game.gameId} value={game.gameId}>{game.localDate} · {game.opponent} · {game.isHome ? "Home" : "Away"}</option>)}
                </select>
              </label>
              {selectedGame ? <div className="grid grid-cols-2 gap-2"><div className="rounded-lg bg-[var(--surface)] p-3 text-sm font-bold text-foreground">{selectedGame.opponent}</div><div className="rounded-lg bg-[var(--surface)] p-3 text-sm font-bold text-foreground">{selectedGame.isHome ? "Home" : "Away"}</div></div> : <Link className="btn-base btn-secondary min-h-11 text-sm" href="/schedule">Manage Schedule</Link>}

              <label className="grid gap-1 text-sm font-bold text-foreground">
                Batting lineup size
                <select
                  className="min-h-11 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 font-semibold outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
                  onChange={(event) => updateLineupSize(event.target.value as LineupSizeOption)}
                  value={setup.lineupSize}
                >
                  {["9", "10", "11", "Everyone"].map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                <button
                  className="btn-base btn-secondary min-h-12 px-4 text-sm"
                  disabled={!canGenerateLineup || !selectedGame}
                  onClick={generateLineup}
                  type="button"
                >
                  <Sparkles className="size-4" aria-hidden="true" />
                  Generate Lineup
                </button>
                {canReviewLineup ? (
                  <Link
                    className="btn-base btn-primary min-h-12 px-4 text-sm"
                    href="/batting-order"
                  >
                    Review
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                ) : (
                  <button
                    className="btn-base btn-secondary min-h-12 px-4 text-sm text-[var(--muted-foreground)]"
                    disabled
                    type="button"
                  >
                    Review
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>
            {lineupValidation.warnings.length ? (
              <div className="mt-3 grid gap-2">
                {lineupValidation.warnings.map((warning) => (
                  <p
                    className="rounded-lg bg-[var(--danger-soft)] px-3 py-2 text-sm font-bold text-[var(--danger)]"
                    key={warning}
                  >
                    {warning}
                  </p>
                ))}
              </div>
            ) : null}
          </article>

          <article className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm shadow-foreground/[0.035]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                  Active players
                </p>
                <h2 className="mt-1 text-lg font-semibold text-foreground">
                  {setup.lineupSize === "Everyone" ? "Everyone bats" : `${setup.lineupSize} hitter lineup`}
                </h2>
              </div>
              <StatusPill tone="ready">{setup.selectedPlayerIds.length} selected</StatusPill>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {players.map((player) => {
                const selected = setup.selectedPlayerIds.includes(player.id);

                return (
                  <button
                    className={cn(
                      "btn-base min-h-10 min-w-0 justify-start px-3 text-left text-sm",
                      selected
                        ? "btn-choice-selected"
                        : "btn-choice text-[var(--muted-foreground)]",
                    )}
                    aria-pressed={selected}
                    key={player.id}
                    onClick={() => togglePlayer(player.id)}
                    type="button"
                  >
                    <Check className={cn("size-4", selected ? "opacity-100" : "opacity-25")} aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate">{player.name.split(" ")[0]}</span>
                    <span className="shrink-0 rounded-full bg-[var(--card)] px-2 py-0.5 text-[0.65rem] leading-4">
                      {player.gender}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="mt-4 rounded-lg bg-[var(--accent-soft)] p-3 text-sm font-semibold text-[var(--accent-strong)]">
              {suggestedLineup.lineupIds.length
                ? `${suggestedLineup.lineupIds.length} hitters ready for coach review.`
                : suggestedLineup.emptyReason ?? "Generate the order after today's player list is set."}
            </div>
          </article>
        </div>

        <article className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm shadow-foreground/[0.035]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
              League rules
            </p>
            <h2 className="mt-1 text-lg font-semibold text-foreground">
              Current game settings
            </h2>
            </div>
            <Link
              className="btn-base btn-secondary min-h-11 px-4 text-sm"
              href="/game-settings"
            >
              <Settings2 className="size-4" aria-hidden="true" />
              Edit Rules
            </Link>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {formatRuleSummary(setup.gameRules).map((rule) => (
              <div
                className={cn(
                  "flex min-h-12 items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm",
                  rule.enabled
                    ? "bg-[var(--accent-soft)] text-[var(--accent-strong)]"
                    : "bg-[var(--surface)] text-[var(--muted-foreground)]",
                )}
                key={rule.label}
              >
                <span className="font-semibold">{rule.label}</span>
                <span className="rounded-full bg-[var(--card)] px-2.5 py-1 text-xs font-bold">
                  {rule.enabled ? rule.value : "Off"}
                </span>
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}

function formatRuleSummary(rules: GameRules) {
  return [
    { label: "Home run limit", value: String(rules.homeRunLimit), enabled: rules.homeRunLimitEnabled },
    { label: "After limit", value: rules.afterHomeRunLimit, enabled: rules.homeRunLimitEnabled },
    { label: "Run limit per inning", value: String(rules.runLimitPerInning), enabled: Boolean(rules.runLimitPerInning) },
    { label: "Mercy rule", value: rules.mercyRule, enabled: true },
    { label: "Courtesy runners", value: "Allowed", enabled: rules.courtesyRunnersAllowed },
    { label: "Walks allowed", value: "Allowed", enabled: rules.walksAllowed },
    { label: "Sac flies tracked", value: "Tracked", enabled: rules.sacFliesTracked },
    { label: "Errors tracked", value: "Tracked", enabled: rules.errorsTracked },
    { label: "Fielder's choices", value: "Tracked", enabled: rules.fieldersChoicesTracked },
  ];
}
