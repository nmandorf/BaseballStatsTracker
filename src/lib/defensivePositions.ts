import { defensivePositionLabels, defensivePositions } from "./defenseEngine.ts";

export type DefensivePositionOption = {
  label: string;
  value: string;
};

export const defensivePositionOptions: readonly DefensivePositionOption[] = defensivePositions.map(
  (position) => ({
    label: `${defensivePositionLabels[position]} (${position})`,
    value: position,
  }),
);

export function getDefensivePositionOptions(savedPosition: string): DefensivePositionOption[] {
  const hasSupportedSavedPosition = defensivePositionOptions.some(
    (position) => position.value === savedPosition,
  );

  if (!savedPosition || hasSupportedSavedPosition) {
    return [...defensivePositionOptions];
  }

  const savedPositionLabel = savedPosition.trim() || "Blank position";

  return [
    { value: savedPosition, label: `${savedPositionLabel} (saved)` },
    ...defensivePositionOptions,
  ];
}
