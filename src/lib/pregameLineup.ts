import type { DefensiveAlignment } from "@/types/defense";
import type { ActiveTeam, Player } from "@/types/player";
import {
  isLineupGenderOptimized,
  recommendBattingOrder,
  validateLineupGenderRules,
  validateLineupPlayerPool,
  type LineupRecommendationOptions,
} from "./lineupRules.ts";
import type {
  LineupSizeOption,
  PregameSetup,
  SuggestedLineupResolution,
} from "./pregameSetupStorage.ts";

type SuggestedLineupOptions = LineupRecommendationOptions & {
  useSavedGeneratedLineup?: boolean;
};

export function buildPregamePlayerPool(
  setup: PregameSetup,
  activeTeam: ActiveTeam | null,
): Player[] {
  const activePlayers = activeTeam?.players.filter(
    (player) => player.isActive,
  ) ?? [];
  const playersById = new Map(
    activePlayers.map((player) => [player.id, player]),
  );

  return setup.selectedPlayerIds
    .map((playerId) => playersById.get(playerId))
    .filter((player): player is Player => Boolean(player))
    .map((player) => ({ ...player, isActive: true }));
}

export function generateLineupIds(
  setup: PregameSetup,
  activeTeam: ActiveTeam | null,
  options: LineupRecommendationOptions = {},
) {
  const pool = buildPregamePlayerPool(setup, activeTeam);
  const targetCount = getLineupTargetCount(
    setup.lineupSize,
    pool.length,
  );

  if (!validateLineupPlayerPool(pool).isLeagueCompliant) {
    return [];
  }

  const recommendedPlayers = recommendBattingOrder(pool, options).map(
    (row) => row.player,
  );
  const targetLineupPlayers = selectTargetLineupPlayers(
    recommendedPlayers,
    targetCount,
  );

  return recommendBattingOrder(targetLineupPlayers, options).map(
    (row) => row.player.id,
  );
}

export function buildAcceptedPregameSetup(
  setup: PregameSetup,
  acceptedLineupIds: string[],
  startingDefense: DefensiveAlignment,
): PregameSetup {
  return {
    ...setup,
    generatedLineupIds: [...acceptedLineupIds],
    acceptedLineupIds: [...acceptedLineupIds],
    startingDefense,
    status: "ACCEPTED",
  };
}

export function isStartingDefenseSavedForFirstFieldingHalf(
  savedAlignment: DefensiveAlignment | null,
  currentAlignment: DefensiveAlignment | null,
  firstDefensiveHalf: Pick<DefensiveAlignment, "inning" | "half">,
) {
  if (!savedAlignment || !currentAlignment) {
    return false;
  }

  return [
    isAlignmentForFieldingHalf(savedAlignment, firstDefensiveHalf),
    isAlignmentForFieldingHalf(currentAlignment, firstDefensiveHalf),
    defensiveSlotsMatch(savedAlignment, currentAlignment),
    unorderedIdsMatch(
      savedAlignment.benchPlayerIds,
      currentAlignment.benchPlayerIds,
    ),
  ].every(Boolean);
}

export function resolveSuggestedLineupIds(
  setup: PregameSetup,
  activeTeam: ActiveTeam | null,
  options: SuggestedLineupOptions = {},
): SuggestedLineupResolution {
  const pool = buildPregamePlayerPool(setup, activeTeam);
  const validation = validateLineupPlayerPool(pool);
  const unavailableResolution = getUnavailableLineupResolution(
    pool,
    validation,
  );

  if (unavailableResolution) {
    return unavailableResolution;
  }

  const generatedLineupIds = generateLineupIds(
    setup,
    activeTeam,
    options,
  );
  const savedGeneratedLineupIds =
    resolveOptionalSavedGeneratedLineupIds(setup, pool, options);

  return getAvailableLineupResolution(
    savedGeneratedLineupIds.length
      ? savedGeneratedLineupIds
      : generatedLineupIds,
  );
}

export function resolveLineupPlayers(
  lineupIds: string[],
  activeTeam: ActiveTeam | null,
) {
  return resolveLineupFromPool(lineupIds, activeTeam?.players ?? []);
}

export function getLineupTargetCount(
  lineupSize: LineupSizeOption,
  selectedCount: number,
) {
  return lineupSize === "Everyone"
    ? selectedCount
    : Math.min(Number(lineupSize), selectedCount);
}

function isAlignmentForFieldingHalf(
  alignment: DefensiveAlignment,
  fieldingHalf: Pick<DefensiveAlignment, "inning" | "half">,
) {
  return (
    alignment.inning === fieldingHalf.inning &&
    alignment.half === fieldingHalf.half
  );
}

function getUnavailableLineupResolution(
  pool: Player[],
  validation: ReturnType<typeof validateLineupPlayerPool>,
) {
  if (!pool.length) {
    return createLineupResolution(
      [],
      false,
      "Select active players in Game Setup before reviewing the order.",
      validation.warnings,
    );
  }

  if (!validation.isLeagueCompliant) {
    return createLineupResolution(
      [],
      false,
      "Update the selected player pool before generating a lineup.",
      validation.warnings,
    );
  }

  return null;
}

function getAvailableLineupResolution(lineupIds: string[]) {
  return lineupIds.length
    ? createLineupResolution(lineupIds, true, null, [])
    : createLineupResolution(
        [],
        true,
        "Generate the lineup from today's selected players.",
        [],
      );
}

function createLineupResolution(
  lineupIds: string[],
  canGenerate: boolean,
  emptyReason: string | null,
  warnings: string[],
): SuggestedLineupResolution {
  return {
    lineupIds,
    canGenerate,
    emptyReason,
    warnings,
  };
}

function resolveOptionalSavedGeneratedLineupIds(
  setup: PregameSetup,
  pool: Player[],
  options: SuggestedLineupOptions,
) {
  if (options.useSavedGeneratedLineup === false) {
    return [];
  }

  return resolveSavedGeneratedLineupIds(
    setup.generatedLineupIds,
    pool,
    getLineupTargetCount(setup.lineupSize, pool.length),
  );
}

function resolveSavedGeneratedLineupIds(
  lineupIds: string[],
  pool: Player[],
  targetCount: number,
) {
  if (lineupIds.length !== targetCount) {
    return [];
  }

  const savedLineup = resolveLineupFromPool(lineupIds, pool);

  if (!isSavedLineupUsable(savedLineup, targetCount)) {
    return [];
  }

  return isLineupGenderOptimized(savedLineup) ? lineupIds : [];
}

function resolveLineupFromPool(lineupIds: string[], pool: Player[]) {
  const playersById = new Map(
    pool.map((player) => [player.id, player]),
  );

  return lineupIds
    .map((playerId) => playersById.get(playerId))
    .filter((player): player is Player => Boolean(player));
}

function isSavedLineupUsable(
  savedLineup: Player[],
  targetCount: number,
) {
  return (
    savedLineup.length === targetCount &&
    validateLineupGenderRules(savedLineup).isLeagueCompliant
  );
}

function selectTargetLineupPlayers(
  recommendedPlayers: Player[],
  targetCount: number,
) {
  const targetLineupPlayers = recommendedPlayers.slice(0, targetCount);

  if (
    !needsMaleIncludedForFemaleLeadoffWraparound(
      targetLineupPlayers,
      recommendedPlayers,
      targetCount,
    )
  ) {
    return targetLineupPlayers;
  }

  const maleWraparoundCandidate = recommendedPlayers
    .slice(targetCount)
    .find((player) => player.gender === "Male");
  const replacementIndex =
    findFinalNonMaleReplacementIndex(targetLineupPlayers);

  if (!maleWraparoundCandidate || replacementIndex < 0) {
    return targetLineupPlayers;
  }

  return targetLineupPlayers.map((player, index) =>
    index === replacementIndex ? maleWraparoundCandidate : player,
  );
}

function needsMaleIncludedForFemaleLeadoffWraparound(
  targetLineupPlayers: Player[],
  recommendedPlayers: Player[],
  targetCount: number,
) {
  return [
    targetLineupPlayers.length > 1,
    targetLineupPlayers[0]?.gender === "Female",
    !hasMaleAfterLeadoff(targetLineupPlayers),
    recommendedPlayers
      .slice(targetCount)
      .some((player) => player.gender === "Male"),
  ].every(Boolean);
}

function hasMaleAfterLeadoff(players: Player[]) {
  return players.some(
    (player, index) => index > 0 && player.gender === "Male",
  );
}

function findFinalNonMaleReplacementIndex(players: Player[]) {
  for (let index = players.length - 1; index > 0; index -= 1) {
    if (players[index].gender !== "Male") {
      return index;
    }
  }

  return -1;
}

function defensiveSlotsMatch(
  left: DefensiveAlignment,
  right: DefensiveAlignment,
) {
  const positions = new Set([
    ...Object.keys(left.slots),
    ...Object.keys(right.slots),
  ]);

  return Array.from(positions).every((position) => {
    const slotKey = position as keyof DefensiveAlignment["slots"];
    return (
      getAssignedPlayerId(left.slots[slotKey]) ===
      getAssignedPlayerId(right.slots[slotKey])
    );
  });
}

function getAssignedPlayerId(
  slot:
    | DefensiveAlignment["slots"][keyof DefensiveAlignment["slots"]]
    | undefined,
) {
  return slot?.status === "ASSIGNED" ? slot.playerId : null;
}

function unorderedIdsMatch(left: string[], right: string[]) {
  if (left.length !== right.length) {
    return false;
  }

  const rightIds = new Set(right);
  return left.every((id) => rightIds.has(id));
}
