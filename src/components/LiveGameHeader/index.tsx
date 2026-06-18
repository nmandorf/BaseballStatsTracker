import type { TeamPhase } from "@/lib/defenseEngine";
import type { GameState } from "@/lib/gameEngine";
import { GameModeTabs } from "@/components/GameModeTabs";

type LiveGameHeaderProps = {
  activeMode: "OFFENSE" | "DEFENSE";
  currentPhase: TeamPhase;
  gameState: GameState;
  teamName: string;
  onEndGame: () => void;
};

export function LiveGameHeader({
  activeMode,
  currentPhase,
  gameState,
  teamName,
  onEndGame,
}: LiveGameHeaderProps) {
  return (
    <div className="mx-auto w-full max-w-6xl px-3 sm:px-4 lg:px-6">
      <GameModeTabs activeMode={activeMode} currentPhase={currentPhase} onEndGame={onEndGame} />
      <header className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--card)] p-3 shadow-sm shadow-foreground/[0.035] sm:p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
              Live game
            </p>
            <h1 className="mt-1 text-xl font-semibold text-foreground sm:text-2xl">
              {gameState.half} {ordinalInning(gameState.inning)}
            </h1>
          </div>
          <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-bold text-[var(--accent-strong)]">
            {currentPhase === "BATTING" ? "Batting" : "Fielding"}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <ScoreValue label={teamName} value={gameState.teamScore} />
          <ScoreValue label={gameState.opponent} value={gameState.opponentScore} />
          <ScoreValue label="Outs" value={gameState.outs} />
        </div>
      </header>
    </div>
  );
}

function ScoreValue({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-0 rounded-md bg-[var(--surface)] px-3 py-2 text-center">
      <p className="truncate text-xs font-bold text-[var(--muted-foreground)]">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  );
}

function ordinalInning(inning: number) {
  const modTen = inning % 10;
  const modHundred = inning % 100;

  if (modTen === 1 && modHundred !== 11) return `${inning}st`;
  if (modTen === 2 && modHundred !== 12) return `${inning}nd`;
  if (modTen === 3 && modHundred !== 13) return `${inning}rd`;
  return `${inning}th`;
}
