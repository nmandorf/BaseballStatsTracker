"use client";

import Link from "next/link";
import { ClipboardList, ShieldCheck } from "lucide-react";
import { saveSelectedScheduledGameId } from "@/lib/scheduleClient";
import type { HomeGameDayState } from "@/lib/homeGameDayState";
import type { TeamSchedule } from "@/types/schedule";

type HomeGameDayActionsProps = {
  canStart: boolean;
  game: HomeGameDayState["game"];
  schedule: TeamSchedule;
};

export function HomeGameDayActions({ canStart, game, schedule }: HomeGameDayActionsProps) {
  return (
    <div className="mt-4 grid gap-2">
      {game ? (
        <Link
          className={`btn-base min-h-14 px-4 text-base ${canStart ? "btn-primary" : "btn-secondary text-[var(--muted-foreground)]"}`}
          href="/game-setup"
          onClick={() => saveSelectedScheduledGameId(schedule.teamId, game.gameId)}
        >
          <ShieldCheck className="size-4" />
          {canStart ? "Review Game Setup" : "Prepare Game"}
        </Link>
      ) : null}
      <div className="grid grid-cols-2 gap-2">
        <Link className="btn-base btn-secondary min-h-12 px-3 text-sm" href="/schedule">Manage Schedule</Link>
        <Link className="btn-base btn-secondary min-h-12 px-3 text-sm" href="/roster">
          <ClipboardList className="size-4" />
          Edit Roster
        </Link>
      </div>
    </div>
  );
}
