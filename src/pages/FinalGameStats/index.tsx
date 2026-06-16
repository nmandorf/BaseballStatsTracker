"use client";

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
import { useCompletedGameStates } from "@/lib/useCompletedGameStates";
import { useFirstGameState } from "@/lib/useFirstGameState";
import { FinalGameStatsView } from "@/sections/StatsEntrySection";

export function FinalGameStatsPage({ gameId }: { gameId: string }) {
  const activeTeam = useActiveTeam();
  const firstGameState = useFirstGameState();
  const completedGameStates = useCompletedGameStates();

  if (!activeTeam) {
    return (
      <AppShell activeNav="stats" requireAuth>
        <TeamSetupGate title="Create your team before reviewing game stats." />
      </AppShell>
    );
  }

  const gameState =
    getCompletedGameById(completedGameStates, gameId) ?? getCompletedGameById(firstGameState, gameId);

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
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[var(--surface)] px-4 text-sm font-bold text-foreground"
                href="/stats"
              >
                Season Stats
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              <Link
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-4 text-sm font-bold text-white"
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
