"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CircleDotDashed } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { getSafeRedirect } from "@/lib/authNavigation";
import { firebase, getFirebaseAuth, getMissingFirebaseConfig } from "@/lib/firebase";
import type { ActiveTeam } from "@/types/player";
import { EmailPasswordAuthForm } from "./EmailPasswordAuthForm";
import { SignedInTeamSelector } from "./SignedInTeamSelector";
import { getFirebaseAuthErrorMessage } from "./authErrorMessages";

const firebaseUiContainerId = "firebaseui-auth-container";

type FirebaseLoginProps = {
  defaultRedirect?: string;
  onTeamSelected?: (team: ActiveTeam) => void;
  showHomeLink?: boolean;
};

type FirebaseLoginViewProps = {
  error: string | null;
  isConfigured: boolean;
  missingConfig: string[];
  onTeamSelected?: (team: ActiveTeam) => void;
  redirectTo: string;
  showHomeLink: boolean;
  user: ReturnType<typeof useAuth>["user"];
};

export function FirebaseLogin({
  defaultRedirect = "/",
  onTeamSelected,
  showHomeLink = true,
}: FirebaseLoginProps) {
  const searchParams = useSearchParams();
  const { isConfigured, isLoading, user } = useAuth();
  const uiStarted = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const redirectTo = getSafeRedirect(searchParams?.get("next") ?? null, defaultRedirect);

  useFirebaseUiLogin({ isConfigured, isLoading, setError, uiStarted, user });

  return (
    <FirebaseLoginLayout
      error={error}
      isConfigured={isConfigured}
      missingConfig={getMissingFirebaseConfig()}
      onTeamSelected={onTeamSelected}
      redirectTo={redirectTo}
      showHomeLink={showHomeLink}
      user={user}
    />
  );
}

function useFirebaseUiLogin({
  isConfigured,
  isLoading,
  setError,
  uiStarted,
  user,
}: {
  isConfigured: boolean;
  isLoading: boolean;
  setError: (error: string | null) => void;
  uiStarted: { current: boolean };
  user: ReturnType<typeof useAuth>["user"];
}) {
  useEffect(() => {
    if (!isConfigured || isLoading || user || uiStarted.current) {
      return;
    }

    let isMounted = true;
    void startFirebaseUi({
      isMounted: () => isMounted,
      setError,
      uiStarted,
    });

    return () => {
      isMounted = false;
    };
  }, [isConfigured, isLoading, setError, uiStarted, user]);
}

async function startFirebaseUi({
  isMounted,
  setError,
  uiStarted,
}: {
  isMounted: () => boolean;
  setError: (error: string | null) => void;
  uiStarted: { current: boolean };
}) {
  try {
    const firebaseui = await import("firebaseui");
    const auth = getFirebaseAuth();
    const existingUi = firebaseui.auth.AuthUI.getInstance() ?? new firebaseui.auth.AuthUI(auth);

    if (!isMounted()) {
      return;
    }

    existingUi.start(`#${firebaseUiContainerId}`, {
      callbacks: {
        signInFailure: (error: unknown) => {
          setError(getFirebaseAuthErrorMessage(error));
          return Promise.resolve();
        },
        signInSuccessWithAuthResult: () => false,
      },
      signInFlow: "popup" as const,
      signInOptions: [{
        provider: firebase.auth.GoogleAuthProvider.PROVIDER_ID,
        customParameters: { prompt: "select_account" },
      }],
      tosUrl: "/",
      privacyPolicyUrl: "/",
    });
    uiStarted.current = true;
  } catch (error) {
    setError(getFirebaseAuthErrorMessage(error));
  }
}

function FirebaseLoginLayout(props: FirebaseLoginViewProps) {
  return (
    <section className="bg-background py-8 sm:py-12">
      <div className="mx-auto grid w-full max-w-6xl gap-5 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
        <FirebaseLoginHero />
        <FirebaseLoginCard {...props} />
      </div>
    </section>
  );
}

function FirebaseLoginHero() {
  return (
    <div className="flex min-h-72 flex-col justify-between rounded-lg border border-[var(--border)] bg-[var(--accent)] p-5 text-white shadow-sm shadow-foreground/[0.04]">
      <div className="flex items-center gap-3">
        <span className="flex size-12 items-center justify-center rounded-lg bg-white/15">
          <CircleDotDashed className="size-5" aria-hidden="true" />
        </span>
        <div>
          <p className="text-sm font-bold">Baseball Stat Tracker</p>
          <p className="text-xs font-semibold text-white/75">Team access</p>
        </div>
      </div>
      <div className="grid gap-2">
        <h1 className="text-3xl font-black tracking-normal">Sign in or create your team account.</h1>
        <p className="max-w-md text-sm font-semibold text-white/78">
          Use Google, or use email to log in if you already have an account or sign up if you are new.
        </p>
      </div>
    </div>
  );
}

function FirebaseLoginCard({
  error,
  isConfigured,
  missingConfig,
  onTeamSelected,
  redirectTo,
  showHomeLink,
  user,
}: FirebaseLoginViewProps) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm shadow-foreground/[0.035] sm:p-6">
      <div className="mb-5 grid gap-1">
        <p className="text-xs font-bold uppercase tracking-normal text-[var(--accent)]">{user ? "Team workspace" : "Team login"}</p>
        <h2 className="text-2xl font-black text-foreground">{user ? "Choose your team" : "Continue with Google or email"}</h2>
        <p className="text-sm font-medium text-[var(--muted-foreground)]">
          {user
            ? "Pick an existing team or create a new one. Roster and stat saves will use the selected team record."
            : "Use Google, log in with an existing email account, or create a new email account. You'll choose a team after signing in."}
        </p>
      </div>
      <FirebaseLoginMessages error={error} isConfigured={isConfigured} missingConfig={missingConfig} />
      {isConfigured ? (
        user
          ? <SignedInTeamSelector onTeamSelected={onTeamSelected} redirectTo={redirectTo} />
          : (
            <div className="grid gap-4">
              <div className="min-h-16" id={firebaseUiContainerId} />
              <EmailPasswordAuthForm />
            </div>
          )
      ) : null}
      {showHomeLink ? (
        <div className="mt-5 border-t border-[var(--border)] pt-4">
          <Link className="text-sm font-bold text-[var(--accent)]" href="/">Back to home</Link>
        </div>
      ) : null}
    </div>
  );
}

function FirebaseLoginMessages({
  error,
  isConfigured,
  missingConfig,
}: {
  error: string | null;
  isConfigured: boolean;
  missingConfig: string[];
}) {
  return (
    <>
      {!isConfigured ? (
        <div className="rounded-lg border border-[var(--warning)]/25 bg-[var(--warning-soft)] p-4 text-sm font-semibold text-[var(--warning)]">
          Add these Firebase variables before signing in: {missingConfig.join(", ")}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-lg border border-[var(--danger)]/25 bg-[var(--danger-soft)] p-4 text-sm font-semibold text-[var(--danger)]">
          {error}
        </div>
      ) : null}
    </>
  );
}
