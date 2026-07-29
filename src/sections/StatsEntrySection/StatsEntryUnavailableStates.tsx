"use client";

import Link from "next/link";
import { ArrowRight, BarChart3 } from "lucide-react";
import { LiveGameHeader } from "@/components/LiveGameHeader";
import { ScreenHeader } from "@/components/ScreenHeader";
import { endGame, type GameState } from "@/lib/gameEngine";
import { saveFirstGameState } from "@/lib/firstGameStorage";

export function DefensiveHalfPrompt({
  gameState,
  teamName,
}: {
  gameState: GameState;
  teamName: string;
}) {
  function endCurrentGame() {
    saveFirstGameState(endGame(gameState, undefined, teamName));
  }

  return (
    <section className="bg-background pb-8 pt-3 sm:pb-10">
      <LiveGameHeader
        activeMode="OFFENSE"
        currentPhase="FIELDING"
        gameState={gameState}
        onEndGame={endCurrentGame}
        teamName={teamName}
      />
      <div className="mx-auto mt-3 w-full max-w-md px-3">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
            Stats Entry
          </p>
          <p className="mt-2 text-sm font-semibold text-foreground">
            Your team is fielding. Open Defense to record the next play.
          </p>
          <Link className="btn-base btn-primary mt-4 min-h-12 w-full px-4 text-sm" href="/defense">
            Open Defense
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}

export function PregameStatsEntryPrompt({
  teamName,
  eligibleAt,
}: {
  teamName: string;
  eligibleAt: string | null;
}) {
  const description = eligibleAt
    ? `Live scoring stays locked until ${eligibleAt}. You can prepare and accept the lineup now.`
    : "Choose a scheduled game, generate the lineup, let the coach approve it, then start the game to unlock live scoring.";

  return (
    <section className="bg-background py-6 sm:py-8">
      <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 lg:px-8">
        <ScreenHeader
          description={description}
          eyebrow="Stats entry"
          icon={BarChart3}
          status="Pregame"
          title={`Start ${teamName} from the approved lineup.`}
        />
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Link className="btn-base btn-secondary min-h-12 px-4 text-sm" href="/game-setup">
            Game Setup
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
          <Link className="btn-base btn-primary min-h-12 px-4 text-sm" href="/batting-order">
            Review Lineup
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
