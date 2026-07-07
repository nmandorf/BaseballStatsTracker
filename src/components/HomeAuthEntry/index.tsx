"use client";

import { Suspense } from "react";
import { CircleDotDashed } from "lucide-react";
import { FirebaseLogin } from "@/components/FirebaseLogin";
import { useAuth } from "@/components/AuthProvider";
import { HomeHeroSection } from "@/sections/HomeHeroSection";
import { useActiveTeam } from "@/lib/teamStorage";
import { ScheduleEditor } from "@/components/ScheduleEditor";
import { useTeamSchedule } from "@/lib/scheduleClient";
import { saveActiveTeam } from "@/lib/teamStorage";

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
  const { schedule, isLoading: isScheduleLoading, error: scheduleError, reload: reloadSchedule } = useTeamSchedule(activeTeam?.id ?? null);

  return renderHomeAuthState({
    activeTeam,
    isLoading,
    isScheduleLoading,
    reloadSchedule,
    schedule,
    scheduleError,
    user,
  });
}

function renderHomeAuthState({
  activeTeam,
  isLoading,
  isScheduleLoading,
  reloadSchedule,
  schedule,
  scheduleError,
  user,
}: {
  activeTeam: ReturnType<typeof useActiveTeam>;
  isLoading: boolean;
  isScheduleLoading: boolean;
  reloadSchedule: () => void;
  schedule: ReturnType<typeof useTeamSchedule>["schedule"];
  scheduleError: string | null;
  user: ReturnType<typeof useAuth>["user"];
}) {
  if (isLoading) return <HomeLoadingState />;
  if (!hasSignedInSelectedTeam(user, activeTeam)) return <HomeLoginState />;
  return renderSelectedTeamHomeState({ activeTeam, isScheduleLoading, reloadSchedule, schedule, scheduleError });
}

function renderSelectedTeamHomeState({
  activeTeam,
  isScheduleLoading,
  reloadSchedule,
  schedule,
  scheduleError,
}: {
  activeTeam: NonNullable<ReturnType<typeof useActiveTeam>>;
  isScheduleLoading: boolean;
  reloadSchedule: () => void;
  schedule: ReturnType<typeof useTeamSchedule>["schedule"];
  scheduleError: string | null;
}) {
  if (!activeTeam.scheduleSetupCompleted) return <FinishScheduleState activeTeam={activeTeam} />;
  return renderCompletedScheduleHomeState({ isScheduleLoading, reloadSchedule, schedule, scheduleError });
}

function renderCompletedScheduleHomeState({
  isScheduleLoading,
  reloadSchedule,
  schedule,
  scheduleError,
}: {
  isScheduleLoading: boolean;
  reloadSchedule: () => void;
  schedule: ReturnType<typeof useTeamSchedule>["schedule"];
  scheduleError: string | null;
}) {
  if (isScheduleLoading) return <HomeLoadingState />;
  if (!schedule || scheduleError) return <ScheduleLoadErrorState onReload={reloadSchedule} scheduleError={scheduleError} />;
  return <HomeHeroSection schedule={schedule} />;
}

function HomeLoginState() {
  return (
    <Suspense fallback={<HomeLoadingState />}>
      <FirebaseLogin defaultRedirect="/" showHomeLink={false} />
    </Suspense>
  );
}

function FinishScheduleState({ activeTeam }: { activeTeam: NonNullable<ReturnType<typeof useActiveTeam>> }) {
  return (
    <section className="bg-background py-6">
      <div className="mx-auto w-full max-w-4xl px-4">
        <h1 className="text-2xl font-black text-foreground">Finish your team schedule</h1>
        <div className="mt-4">
          <ScheduleEditor
            teamId={activeTeam.id}
            onSaved={(saved) => saveActiveTeam({ ...activeTeam, timeZone: saved.timeZone, scheduleSetupCompleted: true })}
          />
        </div>
      </div>
    </section>
  );
}

function ScheduleLoadErrorState({
  onReload,
  scheduleError,
}: {
  onReload: () => void;
  scheduleError: string | null;
}) {
  return (
    <section className="bg-background py-8">
      <div className="mx-auto grid w-full max-w-4xl gap-4 px-4 sm:px-6">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-5">
          <h1 className="text-xl font-black text-foreground">Your schedule could not load</h1>
          <p className="mt-2 text-sm font-semibold text-[var(--muted-foreground)]">
            {scheduleError ?? "The schedule service did not return your team schedule."}
          </p>
          <button className="btn-base btn-primary mt-4 min-h-11 px-4 text-sm" onClick={() => void onReload()} type="button">
            Try Again
          </button>
        </div>
      </div>
    </section>
  );
}

function hasSignedInSelectedTeam(
  user: ReturnType<typeof useAuth>["user"],
  activeTeam: ReturnType<typeof useActiveTeam>,
): activeTeam is NonNullable<ReturnType<typeof useActiveTeam>> {
  return Boolean(user && activeTeam?.ownerUid === user.uid && activeTeam.id);
}
