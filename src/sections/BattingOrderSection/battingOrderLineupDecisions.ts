import { formatCountdown } from "@/lib/countdownFormatting";
import {
  recommendBattingOrder,
  validateLineupGenderRules,
  validateLineupPlayerPool,
  type LineupRecommendationOptions,
  type RecommendedLineupRow,
} from "@/lib/lineupRules";
import type { PregameSetup } from "@/lib/pregameSetupStorage";
import { gameStartLeadTimeMs } from "@/lib/scheduleRules";
import type { ActiveTeam, Player } from "@/types/player";
import type { ScheduleWeek, TeamSchedule } from "@/types/schedule";

export function getStartGameErrorMessage(caught: unknown) {
  return caught instanceof Error
    ? caught.message
    : "Unable to start this game.";
}

export function getActiveTeamId(activeTeam: ActiveTeam | null) {
  return activeTeam?.id ?? null;
}

export function isLineupReady({
  acceptedMatchesLineup,
  defenseIssues,
  lineupGenderOptimized,
  lineupValidation,
  startingDefenseSaved,
}: {
  acceptedMatchesLineup: boolean;
  defenseIssues: unknown[];
  lineupGenderOptimized: boolean;
  lineupValidation: ReturnType<typeof validateLineupGenderRules>;
  startingDefenseSaved: boolean;
}) {
  return [
    acceptedMatchesLineup,
    lineupValidation.isLeagueCompliant,
    lineupGenderOptimized,
    startingDefenseSaved,
    defenseIssues.length === 0,
  ].every(Boolean);
}

export function canStartScheduledGame({
  isStarting,
  lineupReady,
  now,
  selectedScheduledGame,
  startEligibleAt,
}: {
  isStarting: boolean;
  lineupReady: boolean;
  now: number;
  selectedScheduledGame: ScheduleWeek | undefined;
  startEligibleAt: number;
}) {
  return (
    lineupReady &&
    Boolean(selectedScheduledGame) &&
    now >= startEligibleAt &&
    !isStarting
  );
}

export function getLineupWarnings({
  lineup,
  lineupValidation,
  playerPoolValidation,
  suggestedWarnings,
}: {
  lineup: RecommendedLineupRow[];
  lineupValidation: ReturnType<typeof validateLineupGenderRules>;
  playerPoolValidation: ReturnType<typeof validateLineupPlayerPool>;
  suggestedWarnings: string[];
}) {
  const validationWarnings = lineup.length
    ? lineupValidation.warnings
    : [];
  return [
    ...suggestedWarnings,
    ...playerPoolValidation.warnings,
    ...validationWarnings,
  ].filter(
    (warning, index, warnings) => warnings.indexOf(warning) === index,
  );
}

export function resolveLineupRows(input: {
  generatedLineupIds: string[];
  manualOrderIds: string[] | null;
  pregamePlayerPool: Player[];
  rankingOptions: LineupRecommendationOptions;
}) {
  const recommendedRowsById = new Map(
    recommendBattingOrder(input.pregamePlayerPool, input.rankingOptions).map(
      (row) => [row.player.id, row],
    ),
  );
  const recommendedLineup = mapLineupRows(
    input.generatedLineupIds,
    recommendedRowsById,
  );

  if (!input.manualOrderIds) {
    return recommendedLineup;
  }

  return mapLineupRows(
    input.manualOrderIds,
    new Map(recommendedLineup.map((row) => [row.player.id, row])),
  );
}

function mapLineupRows(
  lineupIds: string[],
  rowsByPlayerId: Map<string, RecommendedLineupRow>,
) {
  return lineupIds
    .map((playerId) => rowsByPlayerId.get(playerId))
    .filter((row): row is RecommendedLineupRow => Boolean(row));
}

export function doesAcceptedLineupMatch(
  setup: PregameSetup,
  lineup: RecommendedLineupRow[],
) {
  return (
    lineup.length > 0 &&
    setup.acceptedLineupIds.length === lineup.length &&
    setup.acceptedLineupIds.every(
      (playerId, index) => playerId === lineup[index]?.player.id,
    )
  );
}

export function getSelectedScheduledGame(
  schedule: TeamSchedule | null | undefined,
  gameId: string | null,
) {
  return schedule?.weeks.find(
    (week) => week.kind === "GAME" && week.gameId === gameId,
  );
}

export function getStartEligibleAt(
  selectedScheduledGame: ScheduleWeek | undefined,
) {
  return selectedScheduledGame?.kind === "GAME"
    ? Date.parse(selectedScheduledGame.scheduledStartAt) -
        gameStartLeadTimeMs
    : Number.POSITIVE_INFINITY;
}

export function getStartGameLabel(
  selectedScheduledGame: ScheduleWeek | undefined,
  now: number,
  startEligibleAt: number,
) {
  if (!selectedScheduledGame) {
    return "Start Game";
  }

  return now < startEligibleAt
    ? `Locked · ${formatCountdown(startEligibleAt - now)}`
    : "Start Game";
}
