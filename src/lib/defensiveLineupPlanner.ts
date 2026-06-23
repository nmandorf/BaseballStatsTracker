import {
  defensivePositions,
  generateDefensiveAlignment,
  getAssignedPositionForPlayer,
  normalizeDefensiveAlignment,
} from "./defenseEngine.ts";
import type { DefensiveAlignment, InningHalf } from "@/types/defense";
import type { Player } from "@/types/player";

export type FullGameDefensiveLineupCell = {
  inning: number;
  value: string;
  isBench: boolean;
};

export type FullGameDefensiveLineupRow = {
  playerId: string;
  playerName: string;
  battingOrderPosition: number;
  cells: FullGameDefensiveLineupCell[];
  benchCount: number;
};

export type FullGameDefensiveLineupPlan = {
  inningCount: number;
  innings: number[];
  alignments: DefensiveAlignment[];
  rows: FullGameDefensiveLineupRow[];
  warnings: string[];
  protectedPlayerIds: string[];
  lockedPitcherPlayerId: string | null;
  canBenchEachPlayerAtMostOnce: boolean;
};

type BuildFullGameDefensiveLineupPlanInput = {
  players: Player[];
  firstInning: number;
  half: InningHalf;
  inningCount?: number;
  startingAlignment?: DefensiveAlignment | null;
};

const defaultDefensiveInningCount = 7;

export function buildFullGameDefensiveLineupPlan(
  input: BuildFullGameDefensiveLineupPlanInput,
): FullGameDefensiveLineupPlan | null {
  if (!input.players.length) {
    return null;
  }

  const inningCount = input.inningCount ?? defaultDefensiveInningCount;
  const protectedPlayerIds = getProtectedFemalePlayerIds(input.players);
  const firstAlignment = resolveFirstAlignment({
    players: input.players,
    inning: input.firstInning,
    half: input.half,
    startingAlignment: input.startingAlignment,
    protectedPlayerIds,
  });
  const lockedPitcherPlayerId = firstAlignment.slots.P?.status === "ASSIGNED"
    ? firstAlignment.slots.P.playerId
    : null;
  const canBenchEachPlayerAtMostOnce = canAvoidRepeatBenchSits(
    input.players,
    inningCount,
    protectedPlayerIds,
    lockedPitcherPlayerId,
  );
  const alignments = [firstAlignment];

  for (let inningOffset = 1; inningOffset < inningCount; inningOffset += 1) {
    const inning = input.firstInning + inningOffset;
    const requiredPlayerIds = getRequiredPlayerIdsForInning({
      players: input.players,
      priorAlignments: alignments,
      protectedPlayerIds,
      lockedPitcherPlayerId,
      canBenchEachPlayerAtMostOnce,
    });

    alignments.push(generateDefensiveAlignment({
      players: input.players,
      priorAlignments: alignments,
      inning,
      half: input.half,
      lockedPitcherPlayerId,
      requiredPlayerIds,
    }));
  }

  const rows = input.players.map((player, index) => {
    const cells = alignments.map((alignment) => {
      const assignedPosition = getAssignedPositionForPlayer(alignment, player.id);

      return {
        inning: alignment.inning,
        value: assignedPosition ?? "B",
        isBench: !assignedPosition,
      };
    });

    return {
      playerId: player.id,
      playerName: player.name,
      battingOrderPosition: index + 1,
      cells,
      benchCount: cells.filter((cell) => cell.isBench).length,
    };
  });

  return {
    inningCount,
    innings: alignments.map((alignment) => alignment.inning),
    alignments,
    rows,
    warnings: buildFullGameLineupWarnings({
      players: input.players,
      protectedPlayerIds,
      canBenchEachPlayerAtMostOnce,
      rows,
    }),
    protectedPlayerIds: Array.from(protectedPlayerIds),
    lockedPitcherPlayerId,
    canBenchEachPlayerAtMostOnce,
  };
}

function resolveFirstAlignment(input: {
  players: Player[];
  inning: number;
  half: InningHalf;
  startingAlignment?: DefensiveAlignment | null;
  protectedPlayerIds: Set<string>;
}) {
  if (input.startingAlignment) {
    const normalizedAlignment = normalizeDefensiveAlignment(input.startingAlignment, input.players);
    const benchesProtectedPlayer = normalizedAlignment.benchPlayerIds.some((playerId) => (
      input.protectedPlayerIds.has(playerId)
    ));

    if (!benchesProtectedPlayer) {
      return normalizedAlignment;
    }
  }

  return generateDefensiveAlignment({
    players: input.players,
    priorAlignments: [],
    inning: input.inning,
    half: input.half,
    requiredPlayerIds: input.protectedPlayerIds,
  });
}

function getRequiredPlayerIdsForInning(input: {
  players: Player[];
  priorAlignments: DefensiveAlignment[];
  protectedPlayerIds: Set<string>;
  lockedPitcherPlayerId: string | null;
  canBenchEachPlayerAtMostOnce: boolean;
}) {
  const requiredPlayerIds = new Set(input.protectedPlayerIds);

  if (input.lockedPitcherPlayerId) {
    requiredPlayerIds.add(input.lockedPitcherPlayerId);
  }

  if (input.canBenchEachPlayerAtMostOnce) {
    const benchCounts = getBenchCounts(input.players, input.priorAlignments);

    input.players.forEach((player) => {
      if ((benchCounts[player.id] ?? 0) > 0) {
        requiredPlayerIds.add(player.id);
      }
    });
  }

  if (requiredPlayerIds.size <= defensivePositions.length) {
    return requiredPlayerIds;
  }

  return new Set([...requiredPlayerIds].slice(0, defensivePositions.length));
}

function getProtectedFemalePlayerIds(players: Player[]) {
  const femalePlayers = players.filter((player) => player.gender === "Female");

  if (femalePlayers.length > 3) {
    return new Set<string>();
  }

  return new Set(femalePlayers.map((player) => player.id));
}

function canAvoidRepeatBenchSits(
  players: Player[],
  inningCount: number,
  protectedPlayerIds: Set<string>,
  lockedPitcherPlayerId: string | null,
) {
  const benchSlotsPerInning = Math.max(0, players.length - defensivePositions.length);
  const totalBenchSlots = benchSlotsPerInning * inningCount;
  const oneTimeBenchEligiblePlayerCount = players.filter((player) => (
    !protectedPlayerIds.has(player.id) &&
    player.id !== lockedPitcherPlayerId
  )).length;

  return totalBenchSlots <= oneTimeBenchEligiblePlayerCount;
}

function buildFullGameLineupWarnings(input: {
  players: Player[];
  protectedPlayerIds: Set<string>;
  canBenchEachPlayerAtMostOnce: boolean;
  rows: FullGameDefensiveLineupRow[];
}) {
  const warnings: string[] = [];

  if (input.protectedPlayerIds.size > 0) {
    warnings.push("Three or fewer female players are available, so they are protected from bench innings.");
  }

  if (!input.canBenchEachPlayerAtMostOnce && input.rows.some((row) => row.benchCount > 1)) {
    warnings.push("Repeat bench innings are unavoidable with this roster size and seven defensive innings.");
  }

  return warnings;
}

function getBenchCounts(players: Player[], alignments: DefensiveAlignment[]) {
  const counts = Object.fromEntries(players.map((player) => [player.id, 0])) as Record<string, number>;

  alignments.forEach((alignment) => {
    alignment.benchPlayerIds.forEach((playerId) => {
      if (playerId in counts) {
        counts[playerId] += 1;
      }
    });
  });

  return counts;
}
