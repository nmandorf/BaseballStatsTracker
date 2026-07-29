import { StatusPill } from "@/components/StatusPill";
import { cn } from "@/lib/utils";
import type { GameRules } from "@/types/game";

export function ScoringLimitsCard({
  rules,
  onSaveRules,
  onUpdatePositiveNumber,
}: {
  rules: GameRules;
  onSaveRules: (rules: GameRules) => void;
  onUpdatePositiveNumber: (
    key: "homeRunLimit" | "runLimitPerInning",
    value: string,
  ) => void;
}) {
  return (
    <article className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm shadow-foreground/[0.035]">
      <ScoringLimitsHeader />
      <div className="mt-4 grid gap-3">
        <PositiveNumberRuleField
          label="Home run limit number"
          value={rules.homeRunLimit}
          onChange={(value) =>
            onUpdatePositiveNumber("homeRunLimit", value)
          }
        />
        <AfterHomeRunLimitField rules={rules} onSaveRules={onSaveRules} />
        <PositiveNumberRuleField
          label="Run limit per inning"
          value={rules.runLimitPerInning ?? ""}
          onChange={(value) =>
            onUpdatePositiveNumber("runLimitPerInning", value)
          }
        />
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
        onChange={(event) =>
          onSaveRules({
            ...rules,
            afterHomeRunLimit: event.target
              .value as GameRules["afterHomeRunLimit"],
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
      className={cn(
        "btn-base min-h-11 px-3 text-sm",
        isDisabled ? "btn-choice-selected" : "btn-secondary",
      )}
      aria-pressed={isDisabled}
      onClick={() =>
        onSaveRules({
          ...rules,
          runLimitPerInning: isDisabled ? 5 : null,
        })
      }
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
        onChange={(event) =>
          onSaveRules({ ...rules, mercyRule: event.target.value })
        }
        value={rules.mercyRule}
      />
    </label>
  );
}
