"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Trophy } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ScreenHeader } from "@/components/ScreenHeader";
import { TeamSetupGate } from "@/components/TeamSetupGate";
import { getCompletedGameById } from "@/lib/gameEngine";
import { useActiveTeam } from "@/lib/teamStorage";
import { getVerifiedTeamAccountHeaders } from "@/lib/teamStorage";
import { useCompletedGameStates } from "@/lib/useCompletedGameStates";
import { useFirstGameState } from "@/lib/useFirstGameState";
import { FinalGameStatsView } from "@/sections/StatsEntrySection";
import type { GameState } from "@/lib/gameEngine";

type FinalGamePageState =
  | { kind: "teamSetup" }
  | { kind: "loading" }
  | { kind: "missing" }
  | { kind: "ready"; gameState: GameState; teamName: string };

export function FinalGameStatsPage({ gameId }: { gameId: string }) {
  const activeTeam = useActiveTeam();
  const firstGameState = useFirstGameState();
  const completedGameStates = useCompletedGameStates();
  const localGameState = getCompletedGameById(completedGameStates, gameId) ?? getCompletedGameById(firstGameState, gameId);
  const { isLoadingRemote, remoteGameState } = useRemoteFinalGame(gameId, localGameState);
  const state = getFinalGamePageState({
    activeTeam,
    gameState: localGameState ?? remoteGameState,
    isLoadingRemote,
  });

  return <FinalGamePageStateView state={state} />;
}

export default FinalGameStatsPage;

function getFinalGamePageState({
  activeTeam,
  gameState,
  isLoadingRemote,
}: {
  activeTeam: ReturnType<typeof useActiveTeam>;
  gameState: GameState | null;
  isLoadingRemote: boolean;
}): FinalGamePageState {
  const unavailableState = getUnavailableFinalGamePageState(activeTeam, isLoadingRemote);
  return unavailableState ?? getResolvedFinalGamePageState(activeTeam!, gameState);
}

function getUnavailableFinalGamePageState(
  activeTeam: ReturnType<typeof useActiveTeam>,
  isLoadingRemote: boolean,
): FinalGamePageState | null {
  if (!activeTeam) {
    return { kind: "teamSetup" };
  }

  return isLoadingRemote ? { kind: "loading" } : null;
}

function getResolvedFinalGamePageState(
  activeTeam: NonNullable<ReturnType<typeof useActiveTeam>>,
  gameState: GameState | null,
): FinalGamePageState {
  if (!gameState) {
    return { kind: "missing" };
  }

  return { gameState, kind: "ready", teamName: activeTeam.name };
}

function FinalGamePageStateView({ state }: { state: FinalGamePageState }) {
  if (state.kind === "teamSetup") return <FinalGameTeamSetupState />;
  if (state.kind === "loading") return <FinalGameLoadingState />;
  if (state.kind === "missing") return <FinalGameMissingState />;
  return <FinalGameReadyState gameState={state.gameState} teamName={state.teamName} />;
}

function useRemoteFinalGame(gameId: string, localGameState: GameState | null) {
  const [remoteGameState, setRemoteGameState] = useState<GameState | null>(null);
  const [isLoadingRemote, setIsLoadingRemote] = useState(!localGameState);

  useEffect(() => {
    if (localGameState) return;

    let mounted = true;
    void loadRemoteFinalGame(gameId)
      .then((nextGameState) => {
        if (mounted) setRemoteGameState(nextGameState);
      })
      .finally(() => {
        if (mounted) setIsLoadingRemote(false);
      });

    return () => {
      mounted = false;
    };
  }, [gameId, localGameState]);

  return { isLoadingRemote, remoteGameState };
}

async function loadRemoteFinalGame(gameId: string) {
  const headers = await getVerifiedTeamAccountHeaders();
  const response = await fetch(`/api/games/${encodeURIComponent(gameId)}`, { cache: "no-store", headers });
  const payload = await readRemoteGamePayload(response);

  return payload.state?.status === "FINAL" ? payload.state : null;
}

async function readRemoteGamePayload(response: Response): Promise<{ state?: GameState | null }> {
  return response.ok ? response.json() : { state: null };
}

function FinalGameTeamSetupState() {
  return (
    <AppShell activeNav="stats" requireAuth>
      <TeamSetupGate title="Create your team before reviewing game stats." />
    </AppShell>
  );
}

function FinalGameLoadingState() {
  return (
    <AppShell activeNav="stats" requireAuth>
      <section className="bg-background py-8">
        <div className="mx-auto max-w-3xl px-4 text-sm font-semibold text-[var(--muted-foreground)]">
          Loading final game stats…
        </div>
      </section>
    </AppShell>
  );
}

function FinalGameMissingState() {
  return (
    <AppShell activeNav="stats" requireAuth>
      <section className="bg-background py-6 sm:py-8">
        <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 lg:px-8">
          <ScreenHeader
            description="This completed game is not available in local game history."
            eyebrow="Final"
            icon={Trophy}
            status="Game Not Found"
            title="No final stats found"
          />
          <FinalGameMissingActions />
        </div>
      </section>
    </AppShell>
  );
}

function FinalGameMissingActions() {
  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <Link className="btn-base btn-secondary min-h-12 px-4 text-sm" href="/stats">
        Season Stats
        <ArrowRight className="size-4" aria-hidden="true" />
      </Link>
      <Link className="btn-base btn-primary min-h-12 px-4 text-sm" href="/stats-entry">
        Stats Entry
        <ArrowRight className="size-4" aria-hidden="true" />
      </Link>
    </div>
  );
}

function FinalGameReadyState({
  gameState,
  teamName,
}: {
  gameState: GameState;
  teamName: string;
}) {
  return (
    <AppShell activeNav="stats" requireAuth>
      <FinalGameStatsView
        finishHref="/stats"
        finishLabel="Season Stats"
        gameState={gameState}
        teamName={teamName}
      />
    </AppShell>
  );
}
