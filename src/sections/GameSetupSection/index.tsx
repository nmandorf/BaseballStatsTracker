"use client";

import { useEffect, useMemo } from "react";
import type { ReactNode } from "react";
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
import { useBackendSyncedActiveTeam } from "@/lib/teamStorage";
import { useTeamSchedule } from "@/lib/scheduleClient";
import { cn } from "@/lib/utils";
import type { GameRules } from "@/types/game";
import type { ActiveTeam } from "@/types/player";
import type { ScheduleWeek } from "@/types/schedule";

type PregameSetup = ReturnType<typeof usePregameSetup>;
type ScheduledGame = Extract<ScheduleWeek, { kind: "GAME" }>;

export function GameSetupSection() {
  const activeTeam = useBackendSyncedActiveTeam();
  const setup = usePregameSetup();
  const { schedule, isLoading: isScheduleLoading } = useTeamSchedule(activeTeam?.id ?? null);
  const scheduledGames = useMemo(
    () => getScheduledGames(schedule?.weeks ?? []),
    [schedule],
  );
  const selectedGame = getSelectedScheduledGame(scheduledGames, setup.gameId);
  const lineupTarget = getLineupTargetCount(setup.lineupSize, setup.selectedPlayerIds.length);
  const players = getActivePlayers(activeTeam);
  const selectedPlayerPool = useMemo(
    () => buildPregamePlayerPool(setup, activeTeam),
    [activeTeam, setup],
  );
  const lineupValidation = validateLineupPlayerPool(selectedPlayerPool);
  const canGenerateLineup = canGeneratePregameLineup(setup, lineupValidation);
  const suggestedLineup = resolveSuggestedLineupIds(setup, activeTeam);
  const canReviewLineup = canReviewSuggestedLineup(suggestedLineup);

  useEffect(() => {
    if (!activeTeam || !shouldAutoSelectScheduledGame(scheduledGames, selectedGame)) return;
    selectScheduledGameForPregame(activeTeam.id, scheduledGames[0], activeTeam);
  }, [activeTeam, scheduledGames, selectedGame]);

  if (!activeTeam) {
    return <TeamSetupGate title="Create your team before setting up a game." />;
  }

  function togglePlayer(playerId: string) {
    savePregameSetup({
      ...setup,
      selectedPlayerIds: toggleSelectedPlayerId(setup.selectedPlayerIds, playerId),
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
    const generatedLineupIds = generateLineupIds(setup, activeTeam);

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
        <GameSetupStats setup={setup} lineupTarget={lineupTarget} playerCount={players.length} />

        <div className="mt-4 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <GameDetailsCard
            activeTeam={activeTeam}
            canGenerateLineup={canGenerateLineup}
            canReviewLineup={canReviewLineup}
            isScheduleLoading={isScheduleLoading}
            onGenerateLineup={generateLineup}
            onUpdateLineupSize={updateLineupSize}
            scheduledGames={scheduledGames}
            selectedGame={selectedGame}
            setup={setup}
            warnings={lineupValidation.warnings}
          />

          <ActivePlayersCard
            onTogglePlayer={togglePlayer}
            players={players}
            selectedPlayerIds={setup.selectedPlayerIds}
            setup={setup}
            suggestedLineup={suggestedLineup}
          />
        </div>

        <LeagueRulesCard rules={setup.gameRules} />
      </div>
    </section>
  );
}

function GameSetupStats({
  setup,
  lineupTarget,
  playerCount,
}: {
  setup: PregameSetup;
  lineupTarget: number;
  playerCount: number;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <StatTile helper="Opponent" icon={CalendarDays} label="Today" tone="accent" value={setup.opponent || "TBD"} />
      <StatTile helper={setup.isHome ? "Bat last" : "Bat first"} icon={Home} label="Side" value={setup.isHome ? "Home" : "Away"} />
      <StatTile helper={`${lineupTarget} in generated order`} icon={UsersRound} label="Active" tone="success" value={`${setup.selectedPlayerIds.length}/${playerCount}`} />
    </div>
  );
}

function GameDetailsCard({
  activeTeam,
  canGenerateLineup,
  canReviewLineup,
  isScheduleLoading,
  onGenerateLineup,
  onUpdateLineupSize,
  scheduledGames,
  selectedGame,
  setup,
  warnings,
}: {
  activeTeam: ActiveTeam;
  canGenerateLineup: boolean;
  canReviewLineup: boolean;
  isScheduleLoading: boolean;
  onGenerateLineup: () => void;
  onUpdateLineupSize: (lineupSize: LineupSizeOption) => void;
  scheduledGames: ScheduledGame[];
  selectedGame: ScheduledGame | null;
  setup: PregameSetup;
  warnings: string[];
}) {
  return (
    <article className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm shadow-foreground/[0.035]">
      <CardHeader
        eyebrow="Game details"
        status={<StatusPill tone="planned">Local only</StatusPill>}
        title={selectedGame ? "Ready for lineup review" : "Choose an upcoming game"}
      />
      <div className="mt-4 grid gap-3">
        <ScheduledGameField
          activeTeam={activeTeam}
          disabled={isScheduleLoading || !scheduledGames.length}
          scheduledGames={scheduledGames}
          selectedGame={selectedGame}
        />
        <SelectedGameSummary selectedGame={selectedGame} />
        <LineupSizeField setup={setup} onUpdateLineupSize={onUpdateLineupSize} />
        <LineupActions
          canGenerateLineup={canGenerateLineup}
          canReviewLineup={canReviewLineup}
          hasSelectedGame={Boolean(selectedGame)}
          onGenerateLineup={onGenerateLineup}
        />
      </div>
      <LineupWarnings warnings={warnings} />
    </article>
  );
}

function ScheduledGameField({
  activeTeam,
  disabled,
  scheduledGames,
  selectedGame,
}: {
  activeTeam: ActiveTeam;
  disabled: boolean;
  scheduledGames: ScheduledGame[];
  selectedGame: ScheduledGame | null;
}) {
  return (
    <label className="grid gap-1 text-sm font-bold text-foreground">Scheduled game
      <select
        className="min-h-11 rounded-lg border border-[var(--border)] bg-background px-3"
        disabled={disabled}
        onChange={(event) => selectScheduledPregame(activeTeam, scheduledGames, event.target.value)}
        value={selectedGame?.gameId ?? ""}
      >
        {!scheduledGames.length ? <option value="">No upcoming games</option> : null}
        {scheduledGames.map((game) => (
          <option key={game.gameId} value={game.gameId}>
            {game.localDate} · {game.opponent} · {game.isHome ? "Home" : "Away"}
          </option>
        ))}
      </select>
    </label>
  );
}

function SelectedGameSummary({ selectedGame }: { selectedGame: ScheduledGame | null }) {
  if (!selectedGame) {
    return <Link className="btn-base btn-secondary min-h-11 text-sm" href="/schedule">Manage Schedule</Link>;
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="rounded-lg bg-[var(--surface)] p-3 text-sm font-bold text-foreground">{selectedGame.opponent}</div>
      <div className="rounded-lg bg-[var(--surface)] p-3 text-sm font-bold text-foreground">{selectedGame.isHome ? "Home" : "Away"}</div>
    </div>
  );
}

function LineupSizeField({
  setup,
  onUpdateLineupSize,
}: {
  setup: PregameSetup;
  onUpdateLineupSize: (lineupSize: LineupSizeOption) => void;
}) {
  return (
    <label className="grid gap-1 text-sm font-bold text-foreground">
      Batting lineup size
      <select
        className="min-h-11 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 font-semibold outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
        onChange={(event) => onUpdateLineupSize(event.target.value as LineupSizeOption)}
        value={setup.lineupSize}
      >
        {["9", "10", "11", "Everyone"].map((size) => (
          <option key={size} value={size}>
            {size}
          </option>
        ))}
      </select>
    </label>
  );
}

function LineupActions({
  canGenerateLineup,
  canReviewLineup,
  hasSelectedGame,
  onGenerateLineup,
}: {
  canGenerateLineup: boolean;
  canReviewLineup: boolean;
  hasSelectedGame: boolean;
  onGenerateLineup: () => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
      <button
        className="btn-base btn-secondary min-h-12 px-4 text-sm"
        disabled={!canGenerateLineup || !hasSelectedGame}
        onClick={onGenerateLineup}
        type="button"
      >
        <Sparkles className="size-4" aria-hidden="true" />
        Generate Lineup
      </button>
      <ReviewLineupAction canReviewLineup={canReviewLineup} />
    </div>
  );
}

function ReviewLineupAction({ canReviewLineup }: { canReviewLineup: boolean }) {
  if (canReviewLineup) {
    return (
      <Link className="btn-base btn-primary min-h-12 px-4 text-sm" href="/batting-order">
        Review
        <ArrowRight className="size-4" aria-hidden="true" />
      </Link>
    );
  }

  return (
    <button className="btn-base btn-secondary min-h-12 px-4 text-sm text-[var(--muted-foreground)]" disabled type="button">
      Review
      <ArrowRight className="size-4" aria-hidden="true" />
    </button>
  );
}

function LineupWarnings({ warnings }: { warnings: string[] }) {
  if (!warnings.length) {
    return null;
  }

  return (
    <div className="mt-3 grid gap-2">
      {warnings.map((warning) => (
        <p className="rounded-lg bg-[var(--danger-soft)] px-3 py-2 text-sm font-bold text-[var(--danger)]" key={warning}>
          {warning}
        </p>
      ))}
    </div>
  );
}

function ActivePlayersCard({
  onTogglePlayer,
  players,
  selectedPlayerIds,
  setup,
  suggestedLineup,
}: {
  onTogglePlayer: (playerId: string) => void;
  players: ActiveTeam["players"];
  selectedPlayerIds: string[];
  setup: PregameSetup;
  suggestedLineup: ReturnType<typeof resolveSuggestedLineupIds>;
}) {
  return (
    <article className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm shadow-foreground/[0.035]">
      <CardHeader
        eyebrow="Active players"
        status={<StatusPill tone="ready">{selectedPlayerIds.length} selected</StatusPill>}
        title={getActivePlayersTitle(setup.lineupSize)}
      />
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {players.map((player) => (
          <PlayerSelectionButton
            key={player.id}
            onTogglePlayer={onTogglePlayer}
            player={player}
            selected={selectedPlayerIds.includes(player.id)}
          />
        ))}
      </div>
      <div className="mt-4 rounded-lg bg-[var(--accent-soft)] p-3 text-sm font-semibold text-[var(--accent-strong)]">
        {getSuggestedLineupMessage(suggestedLineup)}
      </div>
    </article>
  );
}

function PlayerSelectionButton({
  onTogglePlayer,
  player,
  selected,
}: {
  onTogglePlayer: (playerId: string) => void;
  player: ActiveTeam["players"][number];
  selected: boolean;
}) {
  return (
    <button
      className={cn(
        "btn-base min-h-10 min-w-0 justify-start px-3 text-left text-sm",
        selected ? "btn-choice-selected" : "btn-choice text-[var(--muted-foreground)]",
      )}
      aria-pressed={selected}
      onClick={() => onTogglePlayer(player.id)}
      type="button"
    >
      <Check className={cn("size-4", selected ? "opacity-100" : "opacity-25")} aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate">{getFirstName(player.name)}</span>
      <span className="shrink-0 rounded-full bg-[var(--card)] px-2 py-0.5 text-[0.65rem] leading-4">
        {player.gender}
      </span>
    </button>
  );
}

function LeagueRulesCard({ rules }: { rules: GameRules }) {
  return (
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
        <Link className="btn-base btn-secondary min-h-11 px-4 text-sm" href="/game-settings">
          <Settings2 className="size-4" aria-hidden="true" />
          Edit Rules
        </Link>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {formatRuleSummary(rules).map((rule) => (
          <RuleSummaryItem key={rule.label} rule={rule} />
        ))}
      </div>
    </article>
  );
}

function RuleSummaryItem({ rule }: { rule: ReturnType<typeof formatRuleSummary>[number] }) {
  return (
    <div
      className={cn(
        "flex min-h-12 items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm",
        rule.enabled
          ? "bg-[var(--accent-soft)] text-[var(--accent-strong)]"
          : "bg-[var(--surface)] text-[var(--muted-foreground)]",
      )}
    >
      <span className="font-semibold">{rule.label}</span>
      <span className="rounded-full bg-[var(--card)] px-2.5 py-1 text-xs font-bold">
        {rule.enabled ? rule.value : "Off"}
      </span>
    </div>
  );
}

function CardHeader({
  eyebrow,
  status,
  title,
}: {
  eyebrow: string;
  status: ReactNode;
  title: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
          {eyebrow}
        </p>
        <h2 className="mt-1 text-lg font-semibold text-foreground">
          {title}
        </h2>
      </div>
      {status}
    </div>
  );
}

function getScheduledGames(weeks: ScheduleWeek[]) {
  return weeks.filter(isScheduledGame);
}

function isScheduledGame(week: ScheduleWeek): week is ScheduledGame {
  return week.kind === "GAME" && week.status === "SCHEDULED";
}

function getSelectedScheduledGame(scheduledGames: ScheduledGame[], gameId: string | null) {
  return scheduledGames.find((game) => game.gameId === gameId) ?? null;
}

function getActivePlayers(activeTeam: ActiveTeam | null) {
  return activeTeam?.players.filter((player) => player.isActive) ?? [];
}

function canGeneratePregameLineup(
  setup: PregameSetup,
  lineupValidation: ReturnType<typeof validateLineupPlayerPool>,
) {
  return setup.selectedPlayerIds.length > 0 && lineupValidation.isLeagueCompliant;
}

function canReviewSuggestedLineup(suggestedLineup: ReturnType<typeof resolveSuggestedLineupIds>) {
  return Boolean(suggestedLineup.lineupIds.length || suggestedLineup.canGenerate);
}

function shouldAutoSelectScheduledGame(
  scheduledGames: ScheduledGame[],
  selectedGame: ScheduledGame | null,
) {
  return Boolean(scheduledGames.length && !selectedGame);
}

function toggleSelectedPlayerId(selectedPlayerIds: string[], playerId: string) {
  return selectedPlayerIds.includes(playerId)
    ? selectedPlayerIds.filter((id) => id !== playerId)
    : [...selectedPlayerIds, playerId];
}

function selectScheduledPregame(activeTeam: ActiveTeam, scheduledGames: ScheduledGame[], gameId: string) {
  const game = getSelectedScheduledGame(scheduledGames, gameId);

  if (game) {
    selectScheduledGameForPregame(activeTeam.id, game, activeTeam);
  }
}

function getActivePlayersTitle(lineupSize: LineupSizeOption) {
  return lineupSize === "Everyone" ? "Everyone bats" : `${lineupSize} hitter lineup`;
}

function getSuggestedLineupMessage(suggestedLineup: ReturnType<typeof resolveSuggestedLineupIds>) {
  return suggestedLineup.lineupIds.length
    ? `${suggestedLineup.lineupIds.length} hitters ready for coach review.`
    : suggestedLineup.emptyReason ?? "Generate the order after today's player list is set.";
}

function getFirstName(name: string) {
  return name.split(" ")[0];
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
