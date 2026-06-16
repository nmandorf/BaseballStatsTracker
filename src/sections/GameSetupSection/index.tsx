"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarDays, Check, Home, Sparkles, UsersRound } from "lucide-react";
import { StatTile } from "@/components/StatTile";
import { StatusPill } from "@/components/StatusPill";
import { TeamSetupGate } from "@/components/TeamSetupGate";
import {
  buildPregamePlayerPool,
  generateLineupIds,
  getLineupTargetCount,
  savePregameSetup,
  usePregameSetup,
  type LineupSizeOption,
} from "@/lib/pregameSetupStorage";
import { validateLineupPlayerPool } from "@/lib/lineupRules";
import { defaultGameRules } from "@/lib/seedTeam";
import { useActiveTeam } from "@/lib/teamStorage";
import { useFirstGameState } from "@/lib/useFirstGameState";
import { cn } from "@/lib/utils";

type Rule = {
  label: string;
  value: string;
  enabled: boolean;
};

const initialRules: Rule[] = [
  { label: "Home run limit", value: String(defaultGameRules.homeRunLimit), enabled: defaultGameRules.homeRunLimitEnabled },
  { label: "After limit", value: defaultGameRules.afterHomeRunLimit, enabled: defaultGameRules.homeRunLimitEnabled },
  { label: "Run limit per inning", value: String(defaultGameRules.runLimitPerInning), enabled: Boolean(defaultGameRules.runLimitPerInning) },
  { label: "Mercy rule", value: defaultGameRules.mercyRule, enabled: true },
  { label: "Courtesy runners", value: "Allowed", enabled: defaultGameRules.courtesyRunnersAllowed },
  { label: "Walks allowed", value: "Allowed", enabled: defaultGameRules.walksAllowed },
  { label: "Sac flies tracked", value: "Tracked", enabled: defaultGameRules.sacFliesTracked },
  { label: "Errors tracked", value: "Tracked", enabled: defaultGameRules.errorsTracked },
  { label: "Fielder's choices", value: "Tracked", enabled: defaultGameRules.fieldersChoicesTracked },
];

export function GameSetupSection() {
  const activeTeam = useActiveTeam();
  const setup = usePregameSetup();
  const gameState = useFirstGameState();
  const [rules, setRules] = useState(initialRules);
  const lineupTarget = getLineupTargetCount(setup.lineupSize, setup.selectedPlayerIds.length);
  const generatedCount = setup.generatedLineupIds.length;
  const players = activeTeam?.players.filter((player) => player.isActive) ?? [];
  const selectedPlayerPool = useMemo(
    () => buildPregamePlayerPool(setup, gameState, activeTeam),
    [activeTeam, gameState, setup],
  );
  const lineupValidation = validateLineupPlayerPool(selectedPlayerPool);
  const canGenerateLineup = setup.selectedPlayerIds.length > 0 && lineupValidation.isLeagueCompliant;

  if (!activeTeam) {
    return <TeamSetupGate title="Create your team before setting up a game." />;
  }

  function togglePlayer(playerId: string) {
    const selectedPlayerIds = setup.selectedPlayerIds.includes(playerId)
      ? setup.selectedPlayerIds.filter((id) => id !== playerId)
      : [...setup.selectedPlayerIds, playerId];

    savePregameSetup({
      ...setup,
      selectedPlayerIds,
      generatedLineupIds: [],
      acceptedLineupIds: [],
      status: "SETUP",
    });
  }

  function toggleRule(label: string) {
    setRules((current) =>
      current.map((rule) =>
        rule.label === label ? { ...rule, enabled: !rule.enabled } : rule,
      ),
    );
  }

  function updateOpponent(opponent: string) {
    savePregameSetup({
      ...setup,
      opponent,
      status: setup.status === "STARTED" ? "SETUP" : setup.status,
    });
  }

  function updateSide(isHome: boolean) {
    savePregameSetup({
      ...setup,
      isHome,
      status: setup.status === "STARTED" ? "SETUP" : setup.status,
    });
  }

  function updateLineupSize(lineupSize: LineupSizeOption) {
    savePregameSetup({
      ...setup,
      lineupSize,
      generatedLineupIds: [],
      acceptedLineupIds: [],
      status: "SETUP",
    });
  }

  function generateLineup() {
    const generatedLineupIds = generateLineupIds(setup, gameState, activeTeam);

    savePregameSetup({
      ...setup,
      generatedLineupIds,
      acceptedLineupIds: [],
      status: "GENERATED",
    });
  }

  return (
    <section className="bg-background py-6 sm:py-8">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-3 sm:grid-cols-3">
          <StatTile helper="Opponent" icon={CalendarDays} label="Today" tone="accent" value={setup.opponent || "TBD"} />
          <StatTile helper={setup.isHome ? "Bat last" : "Bat first"} icon={Home} label="Side" value={setup.isHome ? "Home" : "Away"} />
          <StatTile helper={`${lineupTarget} in generated order`} icon={UsersRound} label="Active" tone="success" value={`${setup.selectedPlayerIds.length}/${players.length}`} />
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <article className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm shadow-foreground/[0.035]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                  Game details
                </p>
                <h2 className="mt-1 text-lg font-semibold text-foreground">
                  Ready for lineup review
                </h2>
              </div>
              <StatusPill tone="planned">Local only</StatusPill>
            </div>

            <div className="mt-4 grid gap-3">
              <label className="grid gap-1 text-sm font-bold text-foreground">
                Opponent
                <input
                  className="min-h-11 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 font-semibold outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
                  onChange={(event) => updateOpponent(event.target.value)}
                  value={setup.opponent}
                />
              </label>

              <div className="grid grid-cols-2 gap-2">
                {[
                  ["Home", true],
                  ["Away", false],
                ].map(([label, value]) => (
                  <button
                    className={cn(
                      "min-h-11 rounded-lg border text-sm font-bold",
                      setup.isHome === value
                        ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                        : "border-[var(--border)] bg-[var(--surface)] text-foreground",
                    )}
                    key={String(label)}
                    onClick={() => updateSide(Boolean(value))}
                    type="button"
                  >
                    {label}
                  </button>
                ))}
              </div>

              <label className="grid gap-1 text-sm font-bold text-foreground">
                Batting lineup size
                <select
                  className="min-h-11 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 font-semibold outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
                  onChange={(event) => updateLineupSize(event.target.value as LineupSizeOption)}
                  value={setup.lineupSize}
                >
                  {["9", "10", "11", "Everyone"].map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                <button
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!canGenerateLineup}
                  onClick={generateLineup}
                  type="button"
                >
                  <Sparkles className="size-4" aria-hidden="true" />
                  Generate Lineup
                </button>
                <Link
                  className={cn(
                    "inline-flex min-h-12 items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold",
                    generatedCount
                      ? "bg-[var(--success-soft)] text-[var(--success)]"
                      : "pointer-events-none bg-[var(--surface)] text-[var(--muted-foreground)]",
                  )}
                  href="/batting-order"
                >
                  Review
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </div>
            </div>
            {lineupValidation.warnings.length ? (
              <div className="mt-3 grid gap-2">
                {lineupValidation.warnings.map((warning) => (
                  <p
                    className="rounded-lg bg-[var(--danger-soft)] px-3 py-2 text-sm font-bold text-[var(--danger)]"
                    key={warning}
                  >
                    {warning}
                  </p>
                ))}
              </div>
            ) : null}
          </article>

          <article className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm shadow-foreground/[0.035]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                  Active players
                </p>
                <h2 className="mt-1 text-lg font-semibold text-foreground">
                  {setup.lineupSize === "Everyone" ? "Everyone bats" : `${setup.lineupSize} hitter lineup`}
                </h2>
              </div>
              <StatusPill tone="ready">{setup.selectedPlayerIds.length} selected</StatusPill>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {players.map((player) => {
                const selected = setup.selectedPlayerIds.includes(player.id);

                return (
                  <button
                    className={cn(
                      "inline-flex min-h-10 min-w-0 items-center gap-2 rounded-lg px-3 text-left text-sm font-bold",
                      selected
                        ? "bg-[var(--success-soft)] text-[var(--success)]"
                        : "bg-[var(--surface)] text-[var(--muted-foreground)]",
                    )}
                    key={player.id}
                    onClick={() => togglePlayer(player.id)}
                    type="button"
                  >
                    <Check className={cn("size-4", selected ? "opacity-100" : "opacity-25")} aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate">{player.name.split(" ")[0]}</span>
                    <span className="shrink-0 rounded-full bg-[var(--card)] px-2 py-0.5 text-[0.65rem] leading-4">
                      {player.gender}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="mt-4 rounded-lg bg-[var(--accent-soft)] p-3 text-sm font-semibold text-[var(--accent-strong)]">
              {generatedCount
                ? `${generatedCount} hitters generated for coach review.`
                : "Generate the order after today's player list is set."}
            </div>
          </article>
        </div>

        <article className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm shadow-foreground/[0.035]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
              League rules
            </p>
            <h2 className="mt-1 text-lg font-semibold text-foreground">
              Tap rules on or off for this local setup
            </h2>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {rules.map((rule) => (
              <button
                className={cn(
                  "flex min-h-12 items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm",
                  rule.enabled
                    ? "bg-[var(--accent-soft)] text-[var(--accent-strong)]"
                    : "bg-[var(--surface)] text-[var(--muted-foreground)]",
                )}
                key={rule.label}
                onClick={() => toggleRule(rule.label)}
                type="button"
              >
                <span className="font-semibold">{rule.label}</span>
                <span className="rounded-full bg-[var(--card)] px-2.5 py-1 text-xs font-bold">
                  {rule.enabled ? rule.value : "Off"}
                </span>
              </button>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}
