"use client";

import { Suspense } from "react";
import { useEffect, useState } from "react";
import { CircleDotDashed } from "lucide-react";
import { FirebaseLogin } from "@/components/FirebaseLogin";
import { useAuth } from "@/components/AuthProvider";
import { HomeHeroSection } from "@/sections/HomeHeroSection";
import { useActiveTeam } from "@/lib/teamStorage";
import type { QuickScoresSchedule } from "@/lib/quickscoresSchedule";

const loadingSchedule: QuickScoresSchedule = {
  game: null,
  note: "Syncing QuickScores schedule...",
  status: "unavailable",
};

const unavailableSchedule: QuickScoresSchedule = {
  game: null,
  note: "QuickScores is not available right now.",
  status: "unavailable",
};

type ScheduleState = {
  schedule: QuickScoresSchedule;
  userId: string | null;
};

function HomeLoadingState() {
  return (
    <section className="bg-background py-8 sm:py-12">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm shadow-foreground/[0.035]">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]">
              <CircleDotDashed className="size-5 animate-spin" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-bold text-foreground">
                Checking team sign-in
              </p>
              <p className="text-sm font-medium text-[var(--muted-foreground)]">
                Loading the right start screen for this device.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function HomeAuthEntry() {
  const { isLoading, user } = useAuth();
  const activeTeam = useActiveTeam();
  const [scheduleState, setScheduleState] = useState<ScheduleState>({
    schedule: loadingSchedule,
    userId: null,
  });

  useEffect(() => {
    if (!user) {
      return;
    }

    let isMounted = true;
    const userId = user.uid;

    async function loadSchedule() {
      try {
        const response = await fetch("/api/schedule");

        if (!response.ok) {
          throw new Error(`Schedule request failed with ${response.status}`);
        }

        const nextSchedule = (await response.json()) as QuickScoresSchedule;

        if (isMounted) {
          setScheduleState({
            schedule: nextSchedule,
            userId,
          });
        }
      } catch {
        if (isMounted) {
          setScheduleState({
            schedule: unavailableSchedule,
            userId,
          });
        }
      }
    }

    void loadSchedule();

    return () => {
      isMounted = false;
    };
  }, [user]);

  if (isLoading) {
    return <HomeLoadingState />;
  }

  if (!user) {
    return (
      <Suspense fallback={<HomeLoadingState />}>
        <FirebaseLogin
          defaultRedirect="/"
          showHomeLink={false}
        />
      </Suspense>
    );
  }

  const hasSelectedTeam = activeTeam?.ownerUid === user.uid && Boolean(activeTeam.id);

  if (!hasSelectedTeam) {
    return (
      <Suspense fallback={<HomeLoadingState />}>
        <FirebaseLogin
          defaultRedirect="/"
          showHomeLink={false}
        />
      </Suspense>
    );
  }

  const signedInSchedule =
    scheduleState.userId === user.uid ? scheduleState.schedule : loadingSchedule;

  return <HomeHeroSection schedule={signedInSchedule} />;
}
