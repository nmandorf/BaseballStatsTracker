import Link from "next/link";
import { Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GameRules } from "@/types/game";

export function LeagueRulesCard({ rules }: { rules: GameRules }) {
  return (
    <article className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm shadow-foreground/[0.035]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
            League rules
          </p>
          <h2 className="mt-1 text-lg font-semibold text-foreground">
            Current game settings
          </h2>
        </div>
        <Link
          className="btn-base btn-secondary min-h-11 px-4 text-sm"
          href="/game-settings"
        >
          <Settings2 className="size-4" aria-hidden="true" />
          Edit Rules
        </Link>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {formatRuleSummary(rules).map((rule) => (
          <div
            className={cn(
              "flex min-h-12 items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm",
              rule.enabled
                ? "bg-[var(--accent-soft)] text-[var(--accent-strong)]"
                : "bg-[var(--surface)] text-[var(--muted-foreground)]",
            )}
            key={rule.label}
          >
            <span className="font-semibold">{rule.label}</span>
            <span className="rounded-full bg-[var(--card)] px-2.5 py-1 text-xs font-bold">
              {rule.enabled ? rule.value : "Off"}
            </span>
          </div>
        ))}
      </div>
    </article>
  );
}

function formatRuleSummary(rules: GameRules) {
  return [
    {
      label: "Home run limit",
      value: String(rules.homeRunLimit),
      enabled: rules.homeRunLimitEnabled,
    },
    {
      label: "After limit",
      value: rules.afterHomeRunLimit,
      enabled: rules.homeRunLimitEnabled,
    },
    {
      label: "Run limit per inning",
      value: String(rules.runLimitPerInning),
      enabled: Boolean(rules.runLimitPerInning),
    },
    { label: "Mercy rule", value: rules.mercyRule, enabled: true },
    {
      label: "Courtesy runners",
      value: "Allowed",
      enabled: rules.courtesyRunnersAllowed,
    },
    { label: "Walks allowed", value: "Allowed", enabled: rules.walksAllowed },
    {
      label: "Sac flies tracked",
      value: "Tracked",
      enabled: rules.sacFliesTracked,
    },
    {
      label: "Errors tracked",
      value: "Tracked",
      enabled: rules.errorsTracked,
    },
    {
      label: "Fielder's choices",
      value: "Tracked",
      enabled: rules.fieldersChoicesTracked,
    },
  ];
}
