import { cn } from "@/lib/utils";
import type { GameRules } from "@/types/game";

export type BooleanRule = {
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

export function RuleTogglesCard({
  rules,
  onUpdateBooleanRule,
}: {
  rules: GameRules;
  onUpdateBooleanRule: (
    key: BooleanRule["key"],
    enabled: boolean,
  ) => void;
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
          <RuleToggleButton
            enabled={rules[rule.key]}
            key={rule.key}
            rule={rule}
            onUpdateBooleanRule={onUpdateBooleanRule}
          />
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
  onUpdateBooleanRule: (
    key: BooleanRule["key"],
    enabled: boolean,
  ) => void;
}) {
  return (
    <button
      className={cn(
        "btn-base flex min-h-16 justify-between gap-3 px-3 py-2.5 text-left",
        enabled
          ? "btn-choice-selected"
          : "btn-choice text-[var(--muted-foreground)]",
      )}
      aria-pressed={enabled}
      onClick={() => onUpdateBooleanRule(rule.key, !enabled)}
      type="button"
    >
      <span className="min-w-0">
        <span className="block text-sm font-bold text-foreground">
          {rule.label}
        </span>
        <span className="mt-1 block text-xs font-semibold">{rule.helper}</span>
      </span>
      <span className="shrink-0 rounded-full bg-[var(--card)] px-2.5 py-1 text-xs font-bold">
        {enabled ? "On" : "Off"}
      </span>
    </button>
  );
}
