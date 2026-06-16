"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, CircleDotDashed, Plus, RefreshCw, UsersRound } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { hydrateFirstGameStateFromPrisma } from "@/lib/firstGameStorage";
import {
  firebase,
  getFirebaseAuth,
  getMissingFirebaseConfig,
} from "@/lib/firebase";
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

function getSafeRedirect(path: string | null) {
  if (!path || !path.startsWith("/") || path.startsWith("//")) {
    return "/roster";
  }

  return path;
}

export function FirebaseLogin() {
  const searchParams = useSearchParams();
  const { isConfigured, isLoading, user } = useAuth();
  const uiStarted = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const redirectTo = getSafeRedirect(searchParams?.get("next") ?? null);

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
            {
              provider: firebase.auth.EmailAuthProvider.PROVIDER_ID,
              requireDisplayName: false,
            },
          ],
          tosUrl: "/",
          privacyPolicyUrl: "/",
        });
        uiStarted.current = true;
      } catch (nextError) {
        setError(
          nextError instanceof Error
            ? nextError.message
            : "Firebase sign-in could not start.",
        );
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
                Kobe&apos;s Peeps team access
              </p>
            </div>
          </div>
          <div className="grid gap-2">
            <h1 className="text-3xl font-black tracking-normal">
              Sign in to your team&apos;s stats.
            </h1>
            <p className="max-w-md text-sm font-semibold text-white/78">
              Google or email sign-in keeps roster, game setup, batting order, and stat entry behind a familiar team login.
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
                : "You'll choose a team after sign-in. Email sign-in works even if you do not use Google."}
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
            <div
              className="min-h-24"
              id={firebaseUiContainerId}
            />
          ) : null}

          {isConfigured && user ? (
            <SignedInTeamSelector redirectTo={redirectTo} />
          ) : null}

          <div className="mt-5 border-t border-[var(--border)] pt-4">
            <Link
              className="text-sm font-bold text-[var(--accent)]"
              href="/"
            >
              Back to home
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function SignedInTeamSelector({ redirectTo }: { redirectTo: string }) {
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
    saveActiveTeam(team);
    savePregameSetup(createDefaultPregameSetup(team));
    hydrateFirstGameStateFromPrisma({ force: true });
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
      const team = await createBackendTeam(nextTeamName, { fallbackToLocal: false });
      saveActiveTeam(team);
      savePregameSetup(createDefaultPregameSetup(team));
      hydrateFirstGameStateFromPrisma({ force: true });
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
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-4 text-sm font-bold text-white shadow-sm shadow-[var(--accent)]/20 disabled:opacity-60"
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
            className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 text-xs font-bold text-[var(--muted-foreground)] hover:bg-[var(--surface)] hover:text-foreground"
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
                <span className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-3 text-xs font-bold text-white">
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
