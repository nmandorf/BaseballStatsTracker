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

type FirebaseLoginViewProps = {
  error: string | null;
  isConfigured: boolean;
  missingConfig: string[];
  onTeamSelected?: (team: ActiveTeam) => void;
  redirectTo: string;
  showHomeLink: boolean;
  user: ReturnType<typeof useAuth>["user"];
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
  const authError = getFirebaseAuthError(error);

  if (!authError) {
    return "Firebase sign-in could not start.";
  }

  return getKnownFirebaseAuthErrorMessage(authError)
    ?? "Firebase sign-in could not complete. Try again or check the Firebase Authentication provider settings.";
}

function getFirebaseAuthError(error: unknown) {
  return isFirebaseAuthError(error) ? error : null;
}

function getKnownFirebaseAuthErrorMessage(error: FirebaseAuthError) {
  return getUnauthorizedDomainAuthMessage(error)
    ?? getFirebaseAuthCodeMessage(error)
    ?? null;
}

function getUnauthorizedDomainAuthMessage(error: FirebaseAuthError) {
  const errorCode = error.code ?? "";
  const errorMessage = error.message ?? "";

  if (isUnauthorizedDomainError(errorCode, errorMessage)) {
    return `Google sign-in is blocked because ${getCurrentAuthHost()} is not authorized for this Firebase project. Add this host in Firebase Console > Authentication > Settings > Authorized domains, then try again.`;
  }

  return null;
}

function getFirebaseAuthCodeMessage(error: FirebaseAuthError) {
  const errorCode = error.code ?? "";

  if (isFirebaseAuthCode(errorCode)) {
    return `Firebase sign-in could not complete (${errorCode}). Try again or check the Firebase Authentication provider settings.`;
  }

  return null;
}

function isUnauthorizedDomainError(errorCode: string, errorMessage: string) {
  return [
    errorCode === unauthorizedDomainCode,
    errorMessage.includes(unauthorizedDomainCode),
    errorMessage.toLowerCase().includes("domain is not authorized"),
  ].some(Boolean);
}

function isFirebaseAuthCode(errorCode: string) {
  return errorCode.startsWith("auth/");
}

function getEmailAuthErrorMessage(error: unknown) {
  if (!isFirebaseAuthError(error)) {
    return "Email sign-in could not complete. Check your email and password, then try again.";
  }

  return emailAuthErrorMessages[error.code ?? ""] ?? defaultEmailAuthErrorMessage;
}

const defaultEmailAuthErrorMessage = "Email sign-in could not complete. Check your email and password, then try again.";

const emailAuthErrorMessages: Record<string, string> = {
  "auth/email-already-in-use": "That email already has an account. Use Log in instead.",
  "auth/invalid-credential": "That email and password did not match an existing account.",
  "auth/invalid-email": "Enter a valid email address.",
  "auth/operation-not-allowed": "Email/password sign-in is not enabled for this Firebase project.",
  "auth/user-not-found": "That email and password did not match an existing account.",
  "auth/weak-password": "Use a password with at least 6 characters.",
  "auth/wrong-password": "That email and password did not match an existing account.",
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

  const missingConfig = getMissingFirebaseConfig();

  return (
    <FirebaseLoginLayout
      error={error}
      isConfigured={isConfigured}
      missingConfig={missingConfig}
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
    if (!shouldStartFirebaseUi(isConfigured, isLoading, user, uiStarted.current)) {
      return;
    }

    let isMounted = true;

    startFirebaseUi({
      isMounted: () => isMounted,
      setError,
      uiStarted,
    });

    return () => {
      isMounted = false;
    };
  }, [isConfigured, isLoading, setError, uiStarted, user]);
}

function shouldStartFirebaseUi(
  isConfigured: boolean,
  isLoading: boolean,
  user: ReturnType<typeof useAuth>["user"],
  uiStarted: boolean,
) {
  return isConfigured && !isLoading && !user && !uiStarted;
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
    const existingUi = getFirebaseUiInstance(firebaseui);

    if (!isMounted()) {
      return;
    }

    existingUi.start(`#${firebaseUiContainerId}`, getFirebaseUiConfig(setError));
    uiStarted.current = true;
  } catch (nextError) {
    setError(getFirebaseAuthErrorMessage(nextError));
  }
}

function getFirebaseUiInstance(firebaseui: typeof import("firebaseui")) {
  const auth = getFirebaseAuth();
  return firebaseui.auth.AuthUI.getInstance() ?? new firebaseui.auth.AuthUI(auth);
}

function getFirebaseUiConfig(setError: (error: string | null) => void) {
  return {
    callbacks: {
      signInFailure: (nextError: unknown) => {
        setError(getFirebaseAuthErrorMessage(nextError));

        return Promise.resolve();
      },
      signInSuccessWithAuthResult: () => false,
    },
    signInFlow: "popup" as const,
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
  };
}

function FirebaseLoginLayout({
  error,
  isConfigured,
  missingConfig,
  onTeamSelected,
  redirectTo,
  showHomeLink,
  user,
}: FirebaseLoginViewProps) {
  return (
    <section className="bg-background py-8 sm:py-12">
      <div className="mx-auto grid w-full max-w-6xl gap-5 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
        <FirebaseLoginHero />
        <FirebaseLoginCard
          error={error}
          isConfigured={isConfigured}
          missingConfig={missingConfig}
          onTeamSelected={onTeamSelected}
          redirectTo={redirectTo}
          showHomeLink={showHomeLink}
          user={user}
        />
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
      <FirebaseLoginHeading user={user} />
      <FirebaseLoginMessages error={error} isConfigured={isConfigured} missingConfig={missingConfig} />
      <FirebaseLoginContent isConfigured={isConfigured} onTeamSelected={onTeamSelected} redirectTo={redirectTo} user={user} />
      <FirebaseHomeLink showHomeLink={showHomeLink} />
    </div>
  );
}

function FirebaseLoginHeading({ user }: { user: ReturnType<typeof useAuth>["user"] }) {
  return (
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

function FirebaseLoginContent({
  isConfigured,
  onTeamSelected,
  redirectTo,
  user,
}: {
  isConfigured: boolean;
  onTeamSelected?: (team: ActiveTeam) => void;
  redirectTo: string;
  user: ReturnType<typeof useAuth>["user"];
}) {
  if (!isConfigured) {
    return null;
  }

  return user
    ? <SignedInTeamSelector onTeamSelected={onTeamSelected} redirectTo={redirectTo} />
    : <FirebaseSignInOptions />;
}

function FirebaseSignInOptions() {
  return (
    <div className="grid gap-4">
      <div className="min-h-16" id={firebaseUiContainerId} />
      <EmailPasswordAuthForm />
    </div>
  );
}

function FirebaseHomeLink({ showHomeLink }: { showHomeLink: boolean }) {
  if (!showHomeLink) {
    return null;
  }

  return (
    <div className="mt-5 border-t border-[var(--border)] pt-4">
      <Link className="text-sm font-bold text-[var(--accent)]" href="/">
        Back to home
      </Link>
    </div>
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
    const credentials = getEmailCredentials(email, password);

    if (!credentials) {
      setEmailError("Email and password are required.");
      return;
    }

    setIsSubmitting(true);
    setEmailError(null);

    try {
      await submitEmailCredentials(mode, credentials);
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
      <EmailAuthModeTabs isLoginMode={isLoginMode} onSwitchMode={switchMode} />
      <EmailAuthInput icon="mail" label="Email" onChange={setEmail} placeholder="you@example.com" value={email} />
      <EmailAuthInput
        autoComplete={isLoginMode ? "current-password" : "new-password"}
        icon="password"
        label="Password"
        minLength={6}
        onChange={setPassword}
        placeholder={isLoginMode ? "Password" : "At least 6 characters"}
        type="password"
        value={password}
      />
      <EmailAuthError error={emailError} />
      <EmailAuthSubmitButton isLoginMode={isLoginMode} isSubmitting={isSubmitting} />
    </form>
  );
}

function getEmailCredentials(email: string, password: string) {
  const trimmedEmail = email.trim();
  return trimmedEmail && password ? { email: trimmedEmail, password } : null;
}

async function submitEmailCredentials(
  mode: EmailAuthMode,
  credentials: { email: string; password: string },
) {
  const auth = getFirebaseAuth();

  if (mode === "login") {
    await auth.signInWithEmailAndPassword(credentials.email, credentials.password);
    return;
  }

  await auth.createUserWithEmailAndPassword(credentials.email, credentials.password);
}

function EmailAuthModeTabs({
  isLoginMode,
  onSwitchMode,
}: {
  isLoginMode: boolean;
  onSwitchMode: (mode: EmailAuthMode) => void;
}) {
  return (
    <div className="grid gap-2">
      <div className="grid grid-cols-2 gap-2 rounded-lg bg-[var(--surface)] p-1">
        <EmailAuthModeButton active={isLoginMode} label="Log in" onClick={() => onSwitchMode("login")} />
        <EmailAuthModeButton active={!isLoginMode} label="Create account" onClick={() => onSwitchMode("create")} />
      </div>
      <p className="text-sm font-medium text-[var(--muted-foreground)]">
        {isLoginMode
          ? "Use this if you already made an email/password account."
          : "Use this once to make a new email/password account."}
      </p>
    </div>
  );
}

function EmailAuthModeButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      className={cn(
        "btn-base min-h-11 rounded-md px-3 text-sm",
        active ? "btn-choice-selected" : "btn-choice text-[var(--muted-foreground)] hover:bg-[var(--card)] hover:text-foreground",
      )}
      aria-pressed={active}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function EmailAuthInput({
  autoComplete = "email",
  icon,
  label,
  minLength,
  onChange,
  placeholder,
  type = "email",
  value,
}: {
  autoComplete?: string;
  icon: "mail" | "password";
  label: string;
  minLength?: number;
  onChange: (value: string) => void;
  placeholder: string;
  type?: "email" | "password";
  value: string;
}) {
  const Icon = icon === "mail" ? Mail : LockKeyhole;

  return (
    <label className="grid gap-2">
      <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-normal text-[var(--muted-foreground)]">
        <Icon className="size-4 text-[var(--accent)]" aria-hidden="true" />
        {label}
      </span>
      <input
        autoComplete={autoComplete}
        className="min-h-12 rounded-lg border border-[var(--border)] bg-white px-3 text-base font-semibold text-foreground outline-none placeholder:text-[var(--muted-foreground)] focus:border-[var(--accent)]"
        inputMode={type === "email" ? "email" : undefined}
        minLength={minLength}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type={type}
        value={value}
      />
    </label>
  );
}

function EmailAuthError({ error }: { error: string | null }) {
  if (!error) {
    return null;
  }

  return (
    <div className="rounded-lg border border-[var(--danger)]/25 bg-[var(--danger-soft)] p-3 text-sm font-semibold text-[var(--danger)]">
      {error}
    </div>
  );
}

function EmailAuthSubmitButton({
  isLoginMode,
  isSubmitting,
}: {
  isLoginMode: boolean;
  isSubmitting: boolean;
}) {
  return (
    <button className="btn-base btn-primary min-h-12 px-4 text-sm" disabled={isSubmitting} type="submit">
      {getEmailAuthSubmitLabel(isSubmitting, isLoginMode)}
      <ArrowRight className="size-4" aria-hidden="true" />
    </button>
  );
}

function getEmailAuthSubmitLabel(isSubmitting: boolean, isLoginMode: boolean) {
  if (isSubmitting) {
    return "Working...";
  }

  return isLoginMode ? "Log in with email" : "Create email account";
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
      await loadTeamsForSelector({
        isMounted: () => isMounted,
        setActiveTeamId,
        setIsLoadingTeams,
        setTeamError,
        setTeams,
      });
    }

    void loadTeams();

    return () => {
      isMounted = false;
    };
  }, []);

  async function activateTeamForLogin(team: ActiveTeam) {
    const previousTeam = loadActiveTeam();
    saveActiveTeam(team);
    prepareFirstGameStateForTeam(previousTeam, team);
    savePregameSetup(createDefaultPregameSetup(team));
    await hydrateFirstGameStateFromPrisma({ force: true });
    onTeamSelected?.(team);
  }

  async function chooseTeam(team: ActiveTeam) {
    setIsSelectingTeamId(team.id);
    setTeamError(null);
    await activateTeamForLogin(team);
    router.replace(redirectTo);
  }

  async function createTeam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextTeamName = getValidTeamName(teamName);

    if (!nextTeamName) {
      setTeamError("Team name is required.");
      return;
    }

    setIsCreatingTeam(true);
    setTeamError(null);

    try {
      const team = await createBackendTeam(nextTeamName);
      await activateTeamForLogin(team);
      setTeams((currentTeams) => mergeSelectedTeam(currentTeams, team));
      setTeamName("");
      router.replace(redirectTo);
    } catch (nextError) {
      setTeamError(getUnknownErrorMessage(nextError, "Team could not be created."));
    } finally {
      setIsCreatingTeam(false);
    }
  }

  async function refreshTeams() {
    setIsLoadingTeams(true);
    setTeams(await loadAvailableTeamsFromBackend());
    setActiveTeamId(loadActiveTeam()?.id ?? null);
    setIsLoadingTeams(false);
  }

  return (
    <div className="grid gap-5">
      <CreateTeamForm
        isCreatingTeam={isCreatingTeam}
        onCreateTeam={createTeam}
        onTeamNameChange={setTeamName}
        teamName={teamName}
      />

      <div className="grid gap-3">
        <TeamListHeader isLoadingTeams={isLoadingTeams} onRefreshTeams={refreshTeams} />
        <TeamSelectorStatus isLoadingTeams={isLoadingTeams} teamError={teamError} teamCount={teams.length} />
        <TeamList
          activeTeamId={activeTeamId}
          isSelectingTeamId={isSelectingTeamId}
          onChooseTeam={chooseTeam}
          teams={teams}
        />
      </div>
    </div>
  );
}

async function loadTeamsForSelector({
  isMounted,
  setActiveTeamId,
  setIsLoadingTeams,
  setTeamError,
  setTeams,
}: {
  isMounted: () => boolean;
  setActiveTeamId: (teamId: string | null) => void;
  setIsLoadingTeams: (isLoading: boolean) => void;
  setTeamError: (error: string | null) => void;
  setTeams: (teams: ActiveTeam[]) => void;
}) {
  setIsLoadingTeams(true);
  setTeamError(null);

  try {
    await applyLoadedTeamsForSelector({ isMounted, setActiveTeamId, setTeams });
  } catch (nextError) {
    setMountedTeamError(isMounted, setTeamError, nextError);
  } finally {
    setMountedTeamLoading(isMounted, setIsLoadingTeams, false);
  }
}

async function applyLoadedTeamsForSelector({
  isMounted,
  setActiveTeamId,
  setTeams,
}: {
  isMounted: () => boolean;
  setActiveTeamId: (teamId: string | null) => void;
  setTeams: (teams: ActiveTeam[]) => void;
}) {
  const availableTeams = await loadAvailableTeamsFromBackend();

  if (!isMounted()) {
    return;
  }

  setTeams(availableTeams);
  setActiveTeamId(loadActiveTeam()?.id ?? null);
}

function setMountedTeamError(
  isMounted: () => boolean,
  setTeamError: (error: string | null) => void,
  error: unknown,
) {
  if (isMounted()) {
    setTeamError(getUnknownErrorMessage(error, "Teams could not be loaded."));
  }
}

function setMountedTeamLoading(
  isMounted: () => boolean,
  setIsLoadingTeams: (isLoading: boolean) => void,
  isLoading: boolean,
) {
  if (isMounted()) {
    setIsLoadingTeams(isLoading);
  }
}

function getUnknownErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function getValidTeamName(teamName: string) {
  const nextTeamName = teamName.trim();
  return nextTeamName || null;
}

function mergeSelectedTeam(currentTeams: ActiveTeam[], team: ActiveTeam) {
  return [
    team,
    ...currentTeams.filter((currentTeam) => currentTeam.id !== team.id),
  ];
}

function CreateTeamForm({
  isCreatingTeam,
  onCreateTeam,
  onTeamNameChange,
  teamName,
}: {
  isCreatingTeam: boolean;
  onCreateTeam: (event: FormEvent<HTMLFormElement>) => void;
  onTeamNameChange: (teamName: string) => void;
  teamName: string;
}) {
  return (
    <form className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3" onSubmit={onCreateTeam}>
      <label className="grid gap-2">
        <span className="text-xs font-bold uppercase tracking-normal text-[var(--muted-foreground)]">
          New team
        </span>
        <span className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <input
            className="min-h-11 rounded-lg border border-[var(--border)] bg-white px-3 text-sm font-semibold text-foreground outline-none placeholder:text-[var(--muted-foreground)] focus:border-[var(--accent)]"
            onChange={(event) => onTeamNameChange(event.target.value)}
            placeholder="Team name"
            value={teamName}
          />
          <button className="btn-base btn-primary min-h-11 px-4 text-sm" disabled={isCreatingTeam || !teamName.trim()} type="submit">
            <Plus className="size-4" aria-hidden="true" />
            {isCreatingTeam ? "Adding" : "Add Team"}
          </button>
        </span>
      </label>
    </form>
  );
}

function TeamListHeader({
  isLoadingTeams,
  onRefreshTeams,
}: {
  isLoadingTeams: boolean;
  onRefreshTeams: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h3 className="text-sm font-black text-foreground">
        Available teams
      </h3>
      <button
        className="btn-base btn-secondary min-h-9 px-3 text-xs text-[var(--muted-foreground)]"
        disabled={isLoadingTeams}
        onClick={() => void onRefreshTeams()}
        type="button"
      >
        <RefreshCw className={cn("size-4", isLoadingTeams ? "animate-spin" : "")} aria-hidden="true" />
        Refresh
      </button>
    </div>
  );
}

function TeamSelectorStatus({
  isLoadingTeams,
  teamCount,
  teamError,
}: {
  isLoadingTeams: boolean;
  teamCount: number;
  teamError: string | null;
}) {
  if (teamError) return <TeamSelectorMessage tone="danger">{teamError}</TeamSelectorMessage>;
  if (isLoadingTeams) return <TeamSelectorMessage>Loading teams...</TeamSelectorMessage>;
  if (teamCount === 0) return <TeamSelectorMessage>No teams yet. Add your first team above.</TeamSelectorMessage>;
  return null;
}

function TeamSelectorMessage({ children, tone = "muted" }: { children: string; tone?: "danger" | "muted" }) {
  return (
    <div className={cn(
      "rounded-lg border p-3 text-sm font-semibold",
      tone === "danger"
        ? "border-[var(--danger)]/25 bg-[var(--danger-soft)] text-[var(--danger)]"
        : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted-foreground)]",
    )}>
      {children}
    </div>
  );
}

function TeamList({
  activeTeamId,
  isSelectingTeamId,
  onChooseTeam,
  teams,
}: {
  activeTeamId: string | null;
  isSelectingTeamId: string | null;
  onChooseTeam: (team: ActiveTeam) => void;
  teams: ActiveTeam[];
}) {
  return (
    <div className="grid gap-2">
      {teams.map((team) => (
        <TeamListItem
          activeTeamId={activeTeamId}
          isSelectingTeamId={isSelectingTeamId}
          key={team.id}
          onChooseTeam={onChooseTeam}
          team={team}
        />
      ))}
    </div>
  );
}

function TeamListItem({
  activeTeamId,
  isSelectingTeamId,
  onChooseTeam,
  team,
}: {
  activeTeamId: string | null;
  isSelectingTeamId: string | null;
  onChooseTeam: (team: ActiveTeam) => void;
  team: ActiveTeam;
}) {
  const isActive = team.id === activeTeamId;
  const isSelecting = isSelectingTeamId === team.id;

  return (
    <button
      className={getTeamListItemClassName(isActive)}
      disabled={Boolean(isSelectingTeamId)}
      onClick={() => void onChooseTeam(team)}
      type="button"
    >
      <TeamListItemDetails isActive={isActive} team={team} />
      <span className="btn-base btn-primary min-h-10 px-3 text-xs">
        {isSelecting ? "Opening" : "Open"}
        <ArrowRight className="size-4" aria-hidden="true" />
      </span>
    </button>
  );
}

function getTeamListItemClassName(isActive: boolean) {
  return cn(
    "grid min-h-20 gap-2 rounded-lg border p-3 text-left shadow-sm shadow-foreground/[0.025] transition hover:-translate-y-0.5 sm:grid-cols-[1fr_auto] sm:items-center",
    isActive ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--border)] bg-[var(--card)] hover:border-[var(--accent)]",
  );
}

function TeamListItemDetails({ isActive, team }: { isActive: boolean; team: ActiveTeam }) {
  return (
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
  );
}
