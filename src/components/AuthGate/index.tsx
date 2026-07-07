"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { ScheduleEditor } from "@/components/ScheduleEditor";
import { useAuth } from "@/components/AuthProvider";
import { getMissingFirebaseConfig } from "@/lib/firebase";
import { hydrateFirstGameStateFromPrisma } from "@/lib/firstGameStorage";
import { hydrateActiveTeamFromBackend, saveActiveTeam, useActiveTeam } from "@/lib/teamStorage";

type AuthGateProps = {
  children: React.ReactNode;
};

type AuthGateState =
  | { kind: "children" }
  | { kind: "loading" }
  | { kind: "missingConfig"; missingConfig: string[] }
  | { kind: "signInRequired"; pathname: string | null }
  | { kind: "scheduleRequired"; activeTeam: NonNullable<ReturnType<typeof useActiveTeam>> };

export function AuthGate({ children }: AuthGateProps) {
  const { isConfigured, isLoading, user } = useAuth();
  const pathname = usePathname();
  const activeTeam = useActiveTeam();
  const state = getAuthGateState({ activeTeam, isConfigured, isLoading, pathname, user });

  useHydrateAuthedTeam(user);

  return <AuthGateStateView state={state}>{children}</AuthGateStateView>;
}

function useHydrateAuthedTeam(user: ReturnType<typeof useAuth>["user"]) {
  useEffect(() => {
    if (!user) {
      return;
    }

    void hydrateActiveTeamFromBackend().then(() => {
      hydrateFirstGameStateFromPrisma({ force: true });
    });
  }, [user]);
}

function getAuthGateState({
  activeTeam,
  isConfigured,
  isLoading,
  pathname,
  user,
}: {
  activeTeam: ReturnType<typeof useActiveTeam>;
  isConfigured: boolean;
  isLoading: boolean;
  pathname: string | null;
  user: ReturnType<typeof useAuth>["user"];
}): AuthGateState {
  const blockingState = getBlockingAuthGateState({ isConfigured, isLoading, pathname, user });
  return blockingState ?? getScheduleGateState(activeTeam, pathname) ?? { kind: "children" };
}

function getBlockingAuthGateState({
  isConfigured,
  isLoading,
  pathname,
  user,
}: {
  isConfigured: boolean;
  isLoading: boolean;
  pathname: string | null;
  user: ReturnType<typeof useAuth>["user"];
}): AuthGateState | null {
  if (isLoading) {
    return { kind: "loading" };
  }

  return getConfiguredAuthGateState({ isConfigured, pathname, user });
}

function getConfiguredAuthGateState({
  isConfigured,
  pathname,
  user,
}: {
  isConfigured: boolean;
  pathname: string | null;
  user: ReturnType<typeof useAuth>["user"];
}): AuthGateState | null {
  if (!isConfigured) {
    return { kind: "missingConfig", missingConfig: getMissingFirebaseConfig() };
  }

  return user ? null : { kind: "signInRequired", pathname };
}

function getScheduleGateState(
  activeTeam: ReturnType<typeof useActiveTeam>,
  pathname: string | null,
): AuthGateState | null {
  if (!activeTeam || activeTeam.scheduleSetupCompleted || pathname === "/schedule") {
    return null;
  }

  return { activeTeam, kind: "scheduleRequired" };
}

function AuthGateStateView({
  children,
  state,
}: {
  children: React.ReactNode;
  state: AuthGateState;
}) {
  if (state.kind === "children") {
    return children;
  }

  return <BlockingAuthGateStateView state={state} />;
}

function BlockingAuthGateStateView({ state }: { state: Exclude<AuthGateState, { kind: "children" }> }) {
  if (state.kind === "loading") return <AuthLoadingState />;
  if (state.kind === "missingConfig") return <FirebaseConfigMissingState missingConfig={state.missingConfig} />;
  if (state.kind === "signInRequired") return <SignInRequiredState pathname={state.pathname} />;
  return <ScheduleSetupRequiredState activeTeam={state.activeTeam} />;
}

function AuthLoadingState() {
  return (
    <section className="bg-background py-10">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-5 text-sm font-semibold text-[var(--muted-foreground)] shadow-sm shadow-foreground/[0.035]">
          Checking team sign-in...
        </div>
      </div>
    </section>
  );
}

function FirebaseConfigMissingState({ missingConfig }: { missingConfig: string[] }) {
  return (
    <section className="bg-background py-10">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-[var(--warning)]/25 bg-[var(--warning-soft)] p-5 shadow-sm shadow-foreground/[0.035]">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-[var(--warning)]" aria-hidden="true" />
            <div className="grid gap-2">
              <h1 className="text-lg font-bold text-foreground">
                Firebase sign-in needs configuration.
              </h1>
              <p className="text-sm font-medium text-[var(--muted-foreground)]">
                Add the missing Firebase web app values to your local environment before opening team stats.
              </p>
              <p className="break-words text-xs font-bold text-[var(--warning)]">
                Missing: {missingConfig.join(", ")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SignInRequiredState({ pathname }: { pathname: string | null }) {
  const loginHref = getLoginHref(pathname);

  return (
    <section className="bg-background py-10">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm shadow-foreground/[0.035]">
          <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
            <div className="grid gap-2">
              <p className="text-xs font-bold uppercase tracking-normal text-[var(--accent)]">
                Team stats locked
              </p>
              <h1 className="text-2xl font-black text-foreground">
                Sign in to open your team&apos;s stats.
              </h1>
              <p className="text-sm font-medium text-[var(--muted-foreground)]">
                Use your Google account to manage roster, game setup, batting order, and live stat entry.
              </p>
            </div>
            <Link className="btn-base btn-primary min-h-12 px-4 text-sm" href={loginHref}>
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function ScheduleSetupRequiredState({
  activeTeam,
}: {
  activeTeam: NonNullable<ReturnType<typeof useActiveTeam>>;
}) {
  return (
    <section className="bg-background py-6 sm:py-8">
      <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-black text-foreground">Finish your team schedule</h1>
        <p className="mt-1 text-sm font-semibold text-[var(--muted-foreground)]">Your roster and existing stats are safe. Add schedule weeks to unlock team workflows.</p>
        <div className="mt-4">
          <ScheduleEditor teamId={activeTeam.id} onSaved={(schedule) => saveActiveTeam({ ...activeTeam, timeZone: schedule.timeZone, scheduleSetupCompleted: true })} />
        </div>
      </div>
    </section>
  );
}

function getLoginHref(pathname: string | null) {
  return `/login?next=${encodeURIComponent(pathname ?? "/")}`;
}
