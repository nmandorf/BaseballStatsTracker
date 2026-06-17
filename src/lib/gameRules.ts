import type { GameRules } from "@/types/game";
import { defaultGameRules } from "./seedTeam.ts";

export function normalizeGameRules(rules: Partial<GameRules> | undefined): GameRules {
  return {
    homeRunLimitEnabled:
      typeof rules?.homeRunLimitEnabled === "boolean"
        ? rules.homeRunLimitEnabled
        : defaultGameRules.homeRunLimitEnabled,
    homeRunLimit: normalizePositiveInteger(rules?.homeRunLimit, defaultGameRules.homeRunLimit),
    afterHomeRunLimit: isHomeRunLimitOutcome(rules?.afterHomeRunLimit)
      ? rules.afterHomeRunLimit
      : defaultGameRules.afterHomeRunLimit,
    runLimitPerInning:
      rules?.runLimitPerInning === null
        ? null
        : normalizeNullablePositiveInteger(rules?.runLimitPerInning, defaultGameRules.runLimitPerInning),
    mercyRule:
      typeof rules?.mercyRule === "string" && rules.mercyRule.trim()
        ? rules.mercyRule.trim()
        : defaultGameRules.mercyRule,
    courtesyRunnersAllowed:
      typeof rules?.courtesyRunnersAllowed === "boolean"
        ? rules.courtesyRunnersAllowed
        : defaultGameRules.courtesyRunnersAllowed,
    walksAllowed:
      typeof rules?.walksAllowed === "boolean"
        ? rules.walksAllowed
        : defaultGameRules.walksAllowed,
    sacFliesTracked:
      typeof rules?.sacFliesTracked === "boolean"
        ? rules.sacFliesTracked
        : defaultGameRules.sacFliesTracked,
    errorsTracked:
      typeof rules?.errorsTracked === "boolean"
        ? rules.errorsTracked
        : defaultGameRules.errorsTracked,
    fieldersChoicesTracked:
      typeof rules?.fieldersChoicesTracked === "boolean"
        ? rules.fieldersChoicesTracked
        : defaultGameRules.fieldersChoicesTracked,
  };
}

function normalizePositiveInteger(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : fallback;
}

function normalizeNullablePositiveInteger(value: unknown, fallback: number | null) {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }

  return fallback;
}

function isHomeRunLimitOutcome(value: unknown): value is GameRules["afterHomeRunLimit"] {
  return value === "Out" || value === "Single" || value === "Other";
}
