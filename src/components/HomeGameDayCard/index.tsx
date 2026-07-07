"use client";

import { HomeByeWeekBanner } from "@/components/HomeByeWeekBanner";
import { HomeGameDayActions } from "@/components/HomeGameDayActions";
import { HomeGameDayHeader } from "@/components/HomeGameDayHeader";
import { HomeNextGamePanel } from "@/components/HomeNextGamePanel";
import { HomeScheduleCompletePanel } from "@/components/HomeScheduleCompletePanel";
import { getHomeGameDayState } from "@/lib/homeGameDayState";
import type { TeamSchedule } from "@/types/schedule";

type HomeGameDayCardProps = {
  now: Date;
  schedule: TeamSchedule;
};

export function HomeGameDayCard({ now, schedule }: HomeGameDayCardProps) {
  const gameDay = getHomeGameDayState(schedule, now);

  return (
    <article className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm sm:p-5">
      <HomeGameDayHeader gameDay={gameDay} />
      {gameDay.byeDate ? (
        <HomeByeWeekBanner byeDate={gameDay.byeDate} />
      ) : null}
      <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
        {gameDay.game ? (
          <HomeNextGamePanel gameDay={gameDay} />
        ) : (
          <HomeScheduleCompletePanel />
        )}
      </div>
      <HomeGameDayActions game={gameDay.game} schedule={schedule} canStart={gameDay.canStart} />
    </article>
  );
}
