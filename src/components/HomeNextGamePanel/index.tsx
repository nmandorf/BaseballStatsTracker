"use client";

import { CalendarClock, MapPin } from "lucide-react";
import { GameDetail } from "@/components/GameDetail";
import { formatCountdown } from "@/lib/countdownFormatting";
import { formatScheduleDate, formatScheduleTime, type HomeGameDayState } from "@/lib/homeGameDayState";

type HomeNextGamePanelProps = {
  gameDay: HomeGameDayState;
};

export function HomeNextGamePanel({ gameDay }: HomeNextGamePanelProps) {
  if (!gameDay.game) {
    return null;
  }

  return (
    <>
      <p className="text-sm font-bold text-[var(--muted-foreground)]">Opponent</p>
      <h2 className="mt-1 text-3xl font-semibold text-foreground sm:text-4xl">{gameDay.game.opponent}</h2>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <GameDetail
          icon={CalendarClock}
          label="First pitch"
          value={`${formatScheduleDate(gameDay.game.localDate)}, ${formatScheduleTime(gameDay.game.startTime)}`}
        />
        <GameDetail icon={MapPin} label="Side" value={gameDay.game.isHome ? "Home" : "Away"} />
      </div>
      <div className="mt-3 rounded-lg bg-[var(--card)] p-3 text-sm font-bold text-foreground">
        {gameDay.canStart ? "Game may be started now" : `Starts in ${formatCountdown(gameDay.eligibleAt - gameDay.nowMs)}`} · {gameDay.preparationLabel}
      </div>
    </>
  );
}
