"use client";

import { StatusPill } from "@/components/StatusPill";
import { TeamSetupGate } from "@/components/TeamSetupGate";
import { savePregameSetup, usePregameSetup } from "@/lib/pregameSetupStorage";
import { useActiveTeam } from "@/lib/teamStorage";
import { cn } from "@/lib/utils";
import type { GameRules } from "@/types/game";

type BooleanRule = {
  key: keyof Pick<
    GameRules,
    | "homeRunLimitEnabled"
    | "courtesyRunnersAllowed"
    | "walksAllowed"
    | "sacFliesTracked"
    | "errorsTracked"
    | "fieldersChoicesTracked"
  >;
  label: string;
  helper: string;
};

const booleanRules: BooleanRule[] = [
  {
    key: "homeRunLimitEnabled",
    label: "Home run limit",
    helper: "Track whether the league cap is active.",
  },
  {
    key: "courtesyRunnersAllowed",
    label: "Courtesy runners",
    helper: "Allow runner substitutions during live entry.",
  },
  {
    key: "walksAllowed",
    label: "Walks",
    helper: "Show and score BB as a batter result.",
  },
  {
    key: "sacFliesTracked",
    label: "Sac flies",
    helper: "Show and score SF as a batter result.",
  },
  {
    key: "errorsTracked",
    label: "Errors",
    helper: "Show and score ROE as a batter result.",
  },
  {
    key: "fieldersChoicesTracked",
    label: "Fielder's choices",
    helper: "Show and score FC as a batter result.",
  },
];

export function GameSettingsSection() {
  const activeTeam = useActiveTeam();
  const setup = usePregameSetup();
  const rules = setup.gameRules;

  if (!activeTeam) {
    return <TeamSetupGate title="Create your team before changing game settings." />;
  }

  function saveRules(nextRules: GameRules) {
    savePregameSetup({
      ...setup,
      gameRules: nextRules,
    });
  }

  function updateBooleanRule(key: BooleanRule["key"], enabled: boolean) {
    saveRules({
      ...rules,
      [key]: enabled,
    });
  }

  function updatePositiveNumber(key: "homeRunLimit" | "runLimitPerInning", value: string) {
    const numericValue = Number(value);

    if (!Number.isInteger(numericValue) || numericValue < 1) {
      return;
    }

    saveRules({
      ...rules,
      [key]: numericValue,
    });
  }

  return (
    <section className="bg-background py-6 sm:py-8">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <h1 className="sr-only">Game settings for {activeTeam.name}</h1>
        <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
          <article className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm shadow-foreground/[0.035]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                  Scoring limits
                </p>
                <h2 className="mt-1 text-lg font-semibold text-foreground">
                  Runs and homers
                </h2>
              </div>
              <StatusPill tone="planned">Pregame</StatusPill>
            </div>

            <div className="mt-4 grid gap-3">
              <label className="grid gap-1 text-sm font-bold text-foreground">
                Home run limit number
                <input
                  className="min-h-11 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 font-semibold outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
                  min={1}
                  onChange={(event) => updatePositiveNumber("homeRunLimit", event.target.value)}
                  type="number"
                  value={rules.homeRunLimit}
                />
              </label>

              <label className="grid gap-1 text-sm font-bold text-foreground">
                After home run limit
                <select
                  className="min-h-11 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 font-semibold outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
                  onChange={(event) =>
                    saveRules({
                      ...rules,
                      afterHomeRunLimit: event.target.value as GameRules["afterHomeRunLimit"],
                    })
                  }
                  value={rules.afterHomeRunLimit}
                >
                  {["Out", "Single", "Other"].map((outcome) => (
                    <option key={outcome} value={outcome}>
                      {outcome}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1 text-sm font-bold text-foreground">
                Run limit per inning
                <input
                  className="min-h-11 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 font-semibold outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
                  min={1}
                  onChange={(event) => updatePositiveNumber("runLimitPerInning", event.target.value)}
                  type="number"
                  value={rules.runLimitPerInning ?? ""}
                />
              </label>

              <button
                className={cn(
                  "btn-base min-h-11 px-3 text-sm",
                  rules.runLimitPerInning === null
                    ? "btn-choice-selected"
                    : "btn-secondary",
                )}
                aria-pressed={rules.runLimitPerInning === null}
                onClick={() => saveRules({ ...rules, runLimitPerInning: rules.runLimitPerInning === null ? 5 : null })}
                type="button"
              >
                {rules.runLimitPerInning === null ? "Run limit off" : "Turn run limit off"}
              </button>

              <label className="grid gap-1 text-sm font-bold text-foreground">
                Mercy rule
                <input
                  className="min-h-11 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 font-semibold outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
                  onChange={(event) => saveRules({ ...rules, mercyRule: event.target.value })}
                  value={rules.mercyRule}
                />
              </label>
            </div>
          </article>

          <article className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm shadow-foreground/[0.035]">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
              Rule toggles
            </p>
            <h2 className="mt-1 text-lg font-semibold text-foreground">
              Result and runner options
            </h2>

            <div className="mt-4 grid gap-2">
              {booleanRules.map((rule) => {
                const enabled = rules[rule.key];

                return (
                  <button
                    className={cn(
                      "btn-base flex min-h-16 justify-between gap-3 px-3 py-2.5 text-left",
                      enabled
                        ? "btn-choice-selected"
                        : "btn-choice text-[var(--muted-foreground)]",
                    )}
                    aria-pressed={enabled}
                    key={rule.key}
                    onClick={() => updateBooleanRule(rule.key, !enabled)}
                    type="button"
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-bold text-foreground">
                        {rule.label}
                      </span>
                      <span className="mt-1 block text-xs font-semibold">
                        {rule.helper}
                      </span>
                    </span>
                    <span className="shrink-0 rounded-full bg-[var(--card)] px-2.5 py-1 text-xs font-bold">
                      {enabled ? "On" : "Off"}
                    </span>
                  </button>
                );
              })}
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
