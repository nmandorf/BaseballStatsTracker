"use client";

import { formatScheduleDate } from "@/lib/homeGameDayState";

type HomeByeWeekBannerProps = {
  byeDate: string;
};

export function HomeByeWeekBanner({ byeDate }: HomeByeWeekBannerProps) {
  return (
    <div className="mt-4 rounded-lg bg-[var(--warning-soft)] p-3 text-sm font-bold text-[var(--warning)]">
      Bye week · {formatScheduleDate(byeDate)}
    </div>
  );
}
