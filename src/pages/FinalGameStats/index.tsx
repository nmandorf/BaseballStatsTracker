"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Trophy } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ScreenHeader } from "@/components/ScreenHeader";
import { TeamSetupGate } from "@/components/TeamSetupGate";
import {
  firstGameHistoryId,
  getCompletedGameById,
} from "@/lib/gameEngine";
import { useActiveTeam } from "@/lib/teamStorage";
import { getVerifiedTeamAccountHeaders } from "@/lib/teamStorage";
import { useCompletedGameStates } from "@/lib/useCompletedGameStates";
import { useFirstGameState } from "@/lib/useFirstGameState";
import { FinalGameStatsView } from "@/sections/StatsEntrySection";
import type { GameState } from "@/lib/gameEngine";

export function FinalGameStatsPage({ gameId }: { gameId: string }) {
  const activeTeam = useActiveTeam();
  const firstGameState = useFirstGameState();
  const completedGameStates = useCompletedGameStates();
  const localGameState = getCompletedGameById(completedGameStates, gameId) ?? getCompletedGameById(firstGameState, gameId);
  const [remoteGameState, setRemoteGameState] = useState<GameState | null>(null);
  const [isLoadingRemote, setIsLoadingRemote] = useState(!localGameState);

  useEffect(() => {
    if (localGameState) return;
    let mounted = true;
    getVerifiedTeamAccountHeaders()
      .then((headers) => fetch(`/api/games/${encodeURIComponent(gameId)}`, { cache: "no-store", headers }))
      .then(async (response) => response.ok ? response.json() as Promise<{ state?: GameState | null }> : { state: null })
      .then((payload) => { if (mounted && payload.state?.status === "FINAL") setRemoteGameState(payload.state); })
      .finally(() => { if (mounted) setIsLoadingRemote(false); });
    return () => { mounted = false; };
  }, [gameId, localGameState]);

  if (!activeTeam) {
    return (
      <AppShell activeNav="stats" requireAuth>
        <TeamSetupGate title="Create your team before reviewing game stats." />
      </AppShell>
    );
  }

  const gameState = localGameState ?? remoteGameState;

  if (isLoadingRemote) {
    return <AppShell activeNav="stats" requireAuth><section className="bg-background py-8"><div className="mx-auto max-w-3xl px-4 text-sm font-semibold text-[var(--muted-foreground)]">Loading final game stats…</div></section></AppShell>;
  }

  if (!gameState) {
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
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Link
                className="btn-base btn-secondary min-h-12 px-4 text-sm"
                href="/stats"
              >
                Season Stats
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              <Link
                className="btn-base btn-primary min-h-12 px-4 text-sm"
                href="/stats-entry"
              >
                Stats Entry
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell activeNav="stats" requireAuth>
      <FinalGameStatsView
        finishHref="/stats"
        finishLabel="Season Stats"
        gameState={gameState}
        teamName={activeTeam.name}
      />
    </AppShell>
  );
}

export { firstGameHistoryId };

export default FinalGameStatsPage;
