import type { GameRules } from "@/types/game";
import { defaultGameRules } from "./seedTeam.ts";

const homeRunLimitOutcomes = new Set<GameRules["afterHomeRunLimit"]>(["Out", "Single", "Other"]);
const booleanRuleKeys = [
  "homeRunLimitEnabled",
  "courtesyRunnersAllowed",
  "walksAllowed",
  "sacFliesTracked",
  "errorsTracked",
  "fieldersChoicesTracked",
] as const;

export function normalizeGameRules(rules: Partial<GameRules> | undefined): GameRules {
  const normalizedRules = rules ?? {};

  return {
    ...normalizeBooleanRules(normalizedRules),
    homeRunLimit: normalizePositiveInteger(normalizedRules.homeRunLimit, defaultGameRules.homeRunLimit),
    afterHomeRunLimit: normalizeHomeRunLimitOutcome(normalizedRules.afterHomeRunLimit),
    runLimitPerInning: normalizeRunLimitPerInning(normalizedRules.runLimitPerInning),
    mercyRule: normalizeMercyRule(normalizedRules.mercyRule),
  };
}

function normalizeBooleanRules(rules: Partial<GameRules>) {
  return Object.fromEntries(
    booleanRuleKeys.map((key) => [
      key,
      normalizeBooleanSetting(rules[key], defaultGameRules[key]),
    ]),
  ) as Pick<GameRules, (typeof booleanRuleKeys)[number]>;
}

function normalizeBooleanSetting(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function normalizePositiveInteger(value: unknown, fallback: number): number;
function normalizePositiveInteger(value: unknown, fallback: number | null): number | null;
function normalizePositiveInteger(value: unknown, fallback: number | null) {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : fallback;
}

function normalizeRunLimitPerInning(value: unknown) {
  return value === null
    ? null
    : normalizePositiveInteger(value, defaultGameRules.runLimitPerInning);
}

function normalizeMercyRule(value: unknown) {
  return typeof value === "string" && value.trim()
    ? value.trim()
    : defaultGameRules.mercyRule;
}

function normalizeHomeRunLimitOutcome(value: unknown) {
  return isHomeRunLimitOutcome(value) ? value : defaultGameRules.afterHomeRunLimit;
}

function isHomeRunLimitOutcome(value: unknown): value is GameRules["afterHomeRunLimit"] {
  return homeRunLimitOutcomes.has(value as GameRules["afterHomeRunLimit"]);
}
