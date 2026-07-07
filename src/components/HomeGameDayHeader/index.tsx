"use client";

import { StatusPill } from "@/components/StatusPill";
import type { HomeGameDayState } from "@/lib/homeGameDayState";

type HomeGameDayHeaderProps = {
  gameDay: HomeGameDayState;
};

export function HomeGameDayHeader({ gameDay }: HomeGameDayHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-sm font-bold text-[var(--accent)]">Baseball Stat Tracker</p>
        <h1 className="mt-1 text-2xl font-semibold text-foreground sm:text-3xl">Game day</h1>
      </div>
      <StatusPill tone={gameDay.statusTone}>{gameDay.statusLabel}</StatusPill>
    </div>
  );
}
