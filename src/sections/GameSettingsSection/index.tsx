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
          <ScoringLimitsCard rules={rules} onSaveRules={saveRules} onUpdatePositiveNumber={updatePositiveNumber} />
          <RuleTogglesCard rules={rules} onUpdateBooleanRule={updateBooleanRule} />
        </div>
      </div>
    </section>
  );
}

function ScoringLimitsCard({
  rules,
  onSaveRules,
  onUpdatePositiveNumber,
}: {
  rules: GameRules;
  onSaveRules: (rules: GameRules) => void;
  onUpdatePositiveNumber: (key: "homeRunLimit" | "runLimitPerInning", value: string) => void;
}) {
  return (
    <article className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm shadow-foreground/[0.035]">
      <ScoringLimitsHeader />
      <div className="mt-4 grid gap-3">
        <PositiveNumberRuleField label="Home run limit number" value={rules.homeRunLimit} onChange={(value) => onUpdatePositiveNumber("homeRunLimit", value)} />
        <AfterHomeRunLimitField rules={rules} onSaveRules={onSaveRules} />
        <PositiveNumberRuleField label="Run limit per inning" value={rules.runLimitPerInning ?? ""} onChange={(value) => onUpdatePositiveNumber("runLimitPerInning", value)} />
        <RunLimitToggle rules={rules} onSaveRules={onSaveRules} />
        <MercyRuleField rules={rules} onSaveRules={onSaveRules} />
      </div>
    </article>
  );
}

function ScoringLimitsHeader() {
  return (
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
  );
}

function PositiveNumberRuleField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | "";
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1 text-sm font-bold text-foreground">
      {label}
      <input
        className="min-h-11 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 font-semibold outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
        min={1}
        onChange={(event) => onChange(event.target.value)}
        type="number"
        value={value}
      />
    </label>
  );
}

function AfterHomeRunLimitField({
  rules,
  onSaveRules,
}: {
  rules: GameRules;
  onSaveRules: (rules: GameRules) => void;
}) {
  return (
    <label className="grid gap-1 text-sm font-bold text-foreground">
      After home run limit
      <select
        className="min-h-11 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 font-semibold outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
        onChange={(event) => onSaveRules({ ...rules, afterHomeRunLimit: event.target.value as GameRules["afterHomeRunLimit"] })}
        value={rules.afterHomeRunLimit}
      >
        {["Out", "Single", "Other"].map((outcome) => (
          <option key={outcome} value={outcome}>
            {outcome}
          </option>
        ))}
      </select>
    </label>
  );
}

function RunLimitToggle({
  rules,
  onSaveRules,
}: {
  rules: GameRules;
  onSaveRules: (rules: GameRules) => void;
}) {
  const isDisabled = rules.runLimitPerInning === null;

  return (
    <button
      className={cn("btn-base min-h-11 px-3 text-sm", isDisabled ? "btn-choice-selected" : "btn-secondary")}
      aria-pressed={isDisabled}
      onClick={() => onSaveRules({ ...rules, runLimitPerInning: isDisabled ? 5 : null })}
      type="button"
    >
      {isDisabled ? "Run limit off" : "Turn run limit off"}
    </button>
  );
}

function MercyRuleField({
  rules,
  onSaveRules,
}: {
  rules: GameRules;
  onSaveRules: (rules: GameRules) => void;
}) {
  return (
    <label className="grid gap-1 text-sm font-bold text-foreground">
      Mercy rule
      <input
        className="min-h-11 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 font-semibold outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
        onChange={(event) => onSaveRules({ ...rules, mercyRule: event.target.value })}
        value={rules.mercyRule}
      />
    </label>
  );
}

function RuleTogglesCard({
  rules,
  onUpdateBooleanRule,
}: {
  rules: GameRules;
  onUpdateBooleanRule: (key: BooleanRule["key"], enabled: boolean) => void;
}) {
  return (
    <article className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm shadow-foreground/[0.035]">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
        Rule toggles
      </p>
      <h2 className="mt-1 text-lg font-semibold text-foreground">
        Result and runner options
      </h2>
      <div className="mt-4 grid gap-2">
        {booleanRules.map((rule) => (
          <RuleToggleButton enabled={rules[rule.key]} key={rule.key} rule={rule} onUpdateBooleanRule={onUpdateBooleanRule} />
        ))}
      </div>
    </article>
  );
}

function RuleToggleButton({
  enabled,
  rule,
  onUpdateBooleanRule,
}: {
  enabled: boolean;
  rule: BooleanRule;
  onUpdateBooleanRule: (key: BooleanRule["key"], enabled: boolean) => void;
}) {
  return (
    <button
      className={cn("btn-base flex min-h-16 justify-between gap-3 px-3 py-2.5 text-left", enabled ? "btn-choice-selected" : "btn-choice text-[var(--muted-foreground)]")}
      aria-pressed={enabled}
      onClick={() => onUpdateBooleanRule(rule.key, !enabled)}
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
}
