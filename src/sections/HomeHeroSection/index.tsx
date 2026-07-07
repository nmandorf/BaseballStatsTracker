"use client";

import { useEffect, useMemo, useState } from "react";
import { AccountTeamsCard } from "@/components/AccountTeamsCard";
import { HomeGameDayCard } from "@/components/HomeGameDayCard";
import type { TeamSchedule } from "@/types/schedule";

export function HomeHeroSection({ schedule }: { schedule: TeamSchedule }) {
  const initialServerNow = useMemo(() => Date.parse(schedule.serverNow), [schedule.serverNow]);
  const [now, setNow] = useState(() => new Date(initialServerNow));

  useEffect(() => {
    const initialClientNow = Date.now();
    const timer = window.setInterval(() => setNow(new Date(initialServerNow + Date.now() - initialClientNow)), 1_000);
    return () => window.clearInterval(timer);
  }, [initialServerNow]);

  return (
    <section className="min-h-[calc(100vh-9rem)] bg-background py-5 sm:py-8">
      <div className="mx-auto grid w-full max-w-6xl gap-4 px-4 sm:px-6 lg:grid-cols-[0.72fr_0.28fr] lg:px-8">
        <HomeGameDayCard now={now} schedule={schedule} />
        <aside><AccountTeamsCard /></aside>
      </div>
    </section>
  );
}
