"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  CircleDotDashed,
  LockKeyhole,
  Mail,
  Plus,
  RefreshCw,
  UsersRound,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import {
  hydrateFirstGameStateFromPrisma,
  prepareFirstGameStateForTeam,
} from "@/lib/firstGameStorage";
import {
  firebase,
  getFirebaseAuth,
  getMissingFirebaseConfig,
} from "@/lib/firebase";
import { getSafeRedirect } from "@/lib/authNavigation";
import { createDefaultPregameSetup, savePregameSetup } from "@/lib/pregameSetupStorage";
import {
  createBackendTeam,
  loadActiveTeam,
  loadAvailableTeamsFromBackend,
  saveActiveTeam,
} from "@/lib/teamStorage";
import { cn } from "@/lib/utils";
import type { ActiveTeam } from "@/types/player";

const firebaseUiContainerId = "firebaseui-auth-container";
const unauthorizedDomainCode = "auth/unauthorized-domain";

type FirebaseLoginProps = {
  defaultRedirect?: string;
  onTeamSelected?: (team: ActiveTeam) => void;
  showHomeLink?: boolean;
};

type FirebaseAuthError = {
  code?: string;
  message?: string;
};

type EmailAuthMode = "login" | "create";

function isFirebaseAuthError(error: unknown): error is FirebaseAuthError {
  return Boolean(error) && typeof error === "object";
}

function getCurrentAuthHost() {
  if (typeof window === "undefined") {
    return "this app domain";
  }

  return window.location.host;
}

function getFirebaseAuthErrorMessage(error: unknown) {
  if (!isFirebaseAuthError(error)) {
    return "Firebase sign-in could not start.";
  }

  const errorCode = error.code ?? "";
  const errorMessage = error.message ?? "";

  if (
    errorCode === unauthorizedDomainCode ||
    errorMessage.includes(unauthorizedDomainCode) ||
    errorMessage.toLowerCase().includes("domain is not authorized")
  ) {
    return `Google sign-in is blocked because ${getCurrentAuthHost()} is not authorized for this Firebase project. Add this host in Firebase Console > Authentication > Settings > Authorized domains, then try again.`;
  }

  if (errorCode.startsWith("auth/")) {
    return `Firebase sign-in could not complete (${errorCode}). Try again or check the Firebase Authentication provider settings.`;
  }

  return "Firebase sign-in could not complete. Try again or check the Firebase Authentication provider settings.";
}

function getEmailAuthErrorMessage(error: unknown) {
  if (!isFirebaseAuthError(error)) {
    return "Email sign-in could not complete. Check your email and password, then try again.";
  }

  switch (error.code) {
    case "auth/email-already-in-use":
      return "That email already has an account. Use Log in instead.";
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "That email and password did not match an existing account.";
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/weak-password":
      return "Use a password with at least 6 characters.";
    case "auth/operation-not-allowed":
      return "Email/password sign-in is not enabled for this Firebase project.";
    default:
      return "Email sign-in could not complete. Check your email and password, then try again.";
  }
}

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

  useEffect(() => {
    if (!isConfigured || isLoading || user || uiStarted.current) {
      return;
    }

    let isMounted = true;

    async function startFirebaseUi() {
      try {
        const firebaseui = await import("firebaseui");
        const auth = getFirebaseAuth();
        const existingUi =
          firebaseui.auth.AuthUI.getInstance() ??
          new firebaseui.auth.AuthUI(auth);

        if (!isMounted) {
          return;
        }

        existingUi.start(`#${firebaseUiContainerId}`, {
          callbacks: {
            signInFailure: (nextError) => {
              setError(getFirebaseAuthErrorMessage(nextError));

              return Promise.resolve();
            },
            signInSuccessWithAuthResult: () => {
              return false;
            },
          },
          signInFlow: "popup",
          signInOptions: [
            {
              provider: firebase.auth.GoogleAuthProvider.PROVIDER_ID,
              customParameters: {
                prompt: "select_account",
              },
            },
          ],
          tosUrl: "/",
          privacyPolicyUrl: "/",
        });
        uiStarted.current = true;
      } catch (nextError) {
        setError(getFirebaseAuthErrorMessage(nextError));
      }
    }

    void startFirebaseUi();

    return () => {
      isMounted = false;
    };
  }, [isConfigured, isLoading, user]);

  const missingConfig = getMissingFirebaseConfig();

  return (
    <section className="bg-background py-8 sm:py-12">
      <div className="mx-auto grid w-full max-w-6xl gap-5 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
        <div className="flex min-h-72 flex-col justify-between rounded-lg border border-[var(--border)] bg-[var(--accent)] p-5 text-white shadow-sm shadow-foreground/[0.04]">
          <div className="flex items-center gap-3">
            <span className="flex size-12 items-center justify-center rounded-lg bg-white/15">
              <CircleDotDashed className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-bold">Baseball Stat Tracker</p>
              <p className="text-xs font-semibold text-white/75">
                Team access
              </p>
            </div>
          </div>
          <div className="grid gap-2">
            <h1 className="text-3xl font-black tracking-normal">
              Sign in or create your team account.
            </h1>
            <p className="max-w-md text-sm font-semibold text-white/78">
              Use Google, or use email to log in if you already have an account or sign up if you are new.
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm shadow-foreground/[0.035] sm:p-6">
          <div className="mb-5 grid gap-1">
            <p className="text-xs font-bold uppercase tracking-normal text-[var(--accent)]">
              {user ? "Team workspace" : "Team login"}
            </p>
            <h2 className="text-2xl font-black text-foreground">
              {user ? "Choose your team" : "Continue with Google or email"}
            </h2>
            <p className="text-sm font-medium text-[var(--muted-foreground)]">
              {user
                ? "Pick an existing team or create a new one. Roster and stat saves will use the selected team record."
                : "Use Google, log in with an existing email account, or create a new email account. You'll choose a team after signing in."}
            </p>
          </div>

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

          {isConfigured && !user ? (
            <div className="grid gap-4">
              <div
                className="min-h-16"
                id={firebaseUiContainerId}
              />
              <EmailPasswordAuthForm />
            </div>
          ) : null}

          {isConfigured && user ? (
            <SignedInTeamSelector
              onTeamSelected={onTeamSelected}
              redirectTo={redirectTo}
            />
          ) : null}

          {showHomeLink ? (
            <div className="mt-5 border-t border-[var(--border)] pt-4">
              <Link
                className="text-sm font-bold text-[var(--accent)]"
                href="/"
              >
                Back to home
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function EmailPasswordAuthForm() {
  const [mode, setMode] = useState<EmailAuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isLoginMode = mode === "login";

  async function submitEmailAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedEmail = email.trim();

    if (!trimmedEmail || !password) {
      setEmailError("Email and password are required.");
      return;
    }

    setIsSubmitting(true);
    setEmailError(null);

    try {
      const auth = getFirebaseAuth();

      if (isLoginMode) {
        await auth.signInWithEmailAndPassword(trimmedEmail, password);
      } else {
        await auth.createUserWithEmailAndPassword(trimmedEmail, password);
      }
    } catch (nextError) {
      setEmailError(getEmailAuthErrorMessage(nextError));
    } finally {
      setIsSubmitting(false);
    }
  }

  function switchMode(nextMode: EmailAuthMode) {
    setMode(nextMode);
    setEmailError(null);
  }

  return (
    <form
      className="grid gap-4 rounded-lg border border-[var(--border)] bg-[var(--background)] p-4"
      onSubmit={submitEmailAuth}
    >
      <div className="grid gap-2">
        <div className="grid grid-cols-2 gap-2 rounded-lg bg-[var(--surface)] p-1">
          <button
            className={cn(
              "btn-base min-h-11 rounded-md px-3 text-sm",
              isLoginMode
                ? "btn-choice-selected"
                : "btn-choice text-[var(--muted-foreground)] hover:bg-[var(--card)] hover:text-foreground",
            )}
            aria-pressed={isLoginMode}
            onClick={() => switchMode("login")}
            type="button"
          >
            Log in
          </button>
          <button
            className={cn(
              "btn-base min-h-11 rounded-md px-3 text-sm",
              !isLoginMode
                ? "btn-choice-selected"
                : "btn-choice text-[var(--muted-foreground)] hover:bg-[var(--card)] hover:text-foreground",
            )}
            aria-pressed={!isLoginMode}
            onClick={() => switchMode("create")}
            type="button"
          >
            Create account
          </button>
        </div>
        <p className="text-sm font-medium text-[var(--muted-foreground)]">
          {isLoginMode
            ? "Use this if you already made an email/password account."
            : "Use this once to make a new email/password account."}
        </p>
      </div>

      <label className="grid gap-2">
        <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-normal text-[var(--muted-foreground)]">
          <Mail className="size-4 text-[var(--accent)]" aria-hidden="true" />
          Email
        </span>
        <input
          autoComplete="email"
          className="min-h-12 rounded-lg border border-[var(--border)] bg-white px-3 text-base font-semibold text-foreground outline-none placeholder:text-[var(--muted-foreground)] focus:border-[var(--accent)]"
          inputMode="email"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          type="email"
          value={email}
        />
      </label>

      <label className="grid gap-2">
        <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-normal text-[var(--muted-foreground)]">
          <LockKeyhole className="size-4 text-[var(--accent)]" aria-hidden="true" />
          Password
        </span>
        <input
          autoComplete={isLoginMode ? "current-password" : "new-password"}
          className="min-h-12 rounded-lg border border-[var(--border)] bg-white px-3 text-base font-semibold text-foreground outline-none placeholder:text-[var(--muted-foreground)] focus:border-[var(--accent)]"
          minLength={6}
          onChange={(event) => setPassword(event.target.value)}
          placeholder={isLoginMode ? "Password" : "At least 6 characters"}
          type="password"
          value={password}
        />
      </label>

      {emailError ? (
        <div className="rounded-lg border border-[var(--danger)]/25 bg-[var(--danger-soft)] p-3 text-sm font-semibold text-[var(--danger)]">
          {emailError}
        </div>
      ) : null}

      <button
        className="btn-base btn-primary min-h-12 px-4 text-sm"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting
          ? "Working..."
          : isLoginMode
            ? "Log in with email"
            : "Create email account"}
        <ArrowRight className="size-4" aria-hidden="true" />
      </button>
    </form>
  );
}

function SignedInTeamSelector({
  onTeamSelected,
  redirectTo,
}: {
  onTeamSelected?: (team: ActiveTeam) => void;
  redirectTo: string;
}) {
  const router = useRouter();
  const [teams, setTeams] = useState<ActiveTeam[]>([]);
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null);
  const [teamName, setTeamName] = useState("");
  const [isLoadingTeams, setIsLoadingTeams] = useState(true);
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);
  const [isSelectingTeamId, setIsSelectingTeamId] = useState<string | null>(null);
  const [teamError, setTeamError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadTeams() {
      setIsLoadingTeams(true);
      setTeamError(null);

      try {
        const availableTeams = await loadAvailableTeamsFromBackend();

        if (!isMounted) {
          return;
        }

        setTeams(availableTeams);
        setActiveTeamId(loadActiveTeam()?.id ?? null);
      } catch (nextError) {
        if (!isMounted) {
          return;
        }

        setTeamError(
          nextError instanceof Error
            ? nextError.message
            : "Teams could not be loaded.",
        );
      } finally {
        if (isMounted) {
          setIsLoadingTeams(false);
        }
      }
    }

    void loadTeams();

    return () => {
      isMounted = false;
    };
  }, []);

  async function chooseTeam(team: ActiveTeam) {
    setIsSelectingTeamId(team.id);
    setTeamError(null);
    const previousTeam = loadActiveTeam();
    saveActiveTeam(team);
    prepareFirstGameStateForTeam(previousTeam, team);
    savePregameSetup(createDefaultPregameSetup(team));
    await hydrateFirstGameStateFromPrisma({ force: true });
    onTeamSelected?.(team);
    router.replace(redirectTo);
  }

  async function createTeam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextTeamName = teamName.trim();

    if (!nextTeamName) {
      setTeamError("Team name is required.");
      return;
    }

    setIsCreatingTeam(true);
    setTeamError(null);

    try {
      const team = await createBackendTeam(nextTeamName);
      const previousTeam = loadActiveTeam();
      saveActiveTeam(team);
      prepareFirstGameStateForTeam(previousTeam, team);
      savePregameSetup(createDefaultPregameSetup(team));
      await hydrateFirstGameStateFromPrisma({ force: true });
      onTeamSelected?.(team);
      setTeams((currentTeams) => [
        team,
        ...currentTeams.filter((currentTeam) => currentTeam.id !== team.id),
      ]);
      setTeamName("");
      router.replace(redirectTo);
    } catch (nextError) {
      setTeamError(
        nextError instanceof Error
          ? nextError.message
          : "Team could not be created.",
      );
    } finally {
      setIsCreatingTeam(false);
    }
  }

  return (
    <div className="grid gap-5">
      <form
        className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3"
        onSubmit={createTeam}
      >
        <label className="grid gap-2">
          <span className="text-xs font-bold uppercase tracking-normal text-[var(--muted-foreground)]">
            New team
          </span>
          <span className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <input
              className="min-h-11 rounded-lg border border-[var(--border)] bg-white px-3 text-sm font-semibold text-foreground outline-none placeholder:text-[var(--muted-foreground)] focus:border-[var(--accent)]"
              onChange={(event) => setTeamName(event.target.value)}
              placeholder="Team name"
              value={teamName}
            />
            <button
              className="btn-base btn-primary min-h-11 px-4 text-sm"
              disabled={isCreatingTeam || !teamName.trim()}
              type="submit"
            >
              <Plus className="size-4" aria-hidden="true" />
              {isCreatingTeam ? "Adding" : "Add Team"}
            </button>
          </span>
        </label>
      </form>

      <div className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-black text-foreground">
            Available teams
          </h3>
          <button
            className="btn-base btn-secondary min-h-9 px-3 text-xs text-[var(--muted-foreground)]"
            disabled={isLoadingTeams}
            onClick={async () => {
              setIsLoadingTeams(true);
              setTeams(await loadAvailableTeamsFromBackend());
              setActiveTeamId(loadActiveTeam()?.id ?? null);
              setIsLoadingTeams(false);
            }}
            type="button"
          >
            <RefreshCw className={cn("size-4", isLoadingTeams ? "animate-spin" : "")} aria-hidden="true" />
            Refresh
          </button>
        </div>

        {teamError ? (
          <div className="rounded-lg border border-[var(--danger)]/25 bg-[var(--danger-soft)] p-3 text-sm font-semibold text-[var(--danger)]">
            {teamError}
          </div>
        ) : null}

        {isLoadingTeams ? (
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 text-sm font-semibold text-[var(--muted-foreground)]">
            Loading teams...
          </div>
        ) : null}

        {!isLoadingTeams && teams.length === 0 ? (
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 text-sm font-semibold text-[var(--muted-foreground)]">
            No teams yet. Add your first team above.
          </div>
        ) : null}

        <div className="grid gap-2">
          {teams.map((team) => {
            const isActive = team.id === activeTeamId;
            const isSelecting = isSelectingTeamId === team.id;

            return (
              <button
                className={cn(
                  "grid min-h-20 gap-2 rounded-lg border p-3 text-left shadow-sm shadow-foreground/[0.025] transition hover:-translate-y-0.5 sm:grid-cols-[1fr_auto] sm:items-center",
                  isActive
                    ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                    : "border-[var(--border)] bg-[var(--card)] hover:border-[var(--accent)]",
                )}
                disabled={Boolean(isSelectingTeamId)}
                key={team.id}
                onClick={() => void chooseTeam(team)}
                type="button"
              >
                <span className="grid min-w-0 gap-1">
                  <span className="truncate text-base font-black text-foreground">
                    {team.name}
                  </span>
                  <span className="flex flex-wrap items-center gap-2 text-xs font-bold text-[var(--muted-foreground)]">
                    <span className="inline-flex items-center gap-1">
                      <UsersRound className="size-4 text-[var(--accent)]" aria-hidden="true" />
                      {team.players.length} player{team.players.length === 1 ? "" : "s"}
                    </span>
                    {isActive ? <span>Current team</span> : null}
                  </span>
                </span>
                <span className="btn-base btn-primary min-h-10 px-3 text-xs">
                  {isSelecting ? "Opening" : "Open"}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
