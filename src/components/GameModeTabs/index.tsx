import Link from "next/link";
import { ChartNoAxesColumnIncreasing, Flag, ShieldCheck } from "lucide-react";
import type { TeamPhase } from "@/lib/defenseEngine";
import { cn } from "@/lib/utils";

type GameModeTabsProps = {
  activeMode: "OFFENSE" | "DEFENSE";
  currentPhase: TeamPhase;
  onEndGame: () => void;
};

const gameModes = [
  {
    mode: "OFFENSE",
    label: "Offense",
    href: "/stats-entry",
    icon: ChartNoAxesColumnIncreasing,
    phase: "BATTING",
  },
  {
    mode: "DEFENSE",
    label: "Defense",
    href: "/defense",
    icon: ShieldCheck,
    phase: "FIELDING",
  },
] as const;

export function GameModeTabs({ activeMode, currentPhase, onEndGame }: GameModeTabsProps) {
  return (
    <div className="grid grid-cols-[1fr_1fr_auto] gap-2" role="group" aria-label="Game mode">
      {gameModes.map(({ mode, label, href, icon: Icon, phase }) => {
        const isActive = mode === activeMode;
        const isCurrentPhase = phase === currentPhase;

        return (
          <Link
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-bold",
              isActive
                ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                : "border-[var(--border)] bg-[var(--card)] text-foreground",
            )}
            href={href}
            key={mode}
          >
            <Icon className="size-4" aria-hidden="true" />
            {label}
            {isCurrentPhase ? (
              <>
                <span className="size-2 rounded-full bg-current" aria-hidden="true" />
                <span className="sr-only">Current half</span>
              </>
            ) : null}
          </Link>
        );
      })}
      <button
        aria-label="End game"
        className="flex size-11 items-center justify-center rounded-lg border border-[var(--danger)]/25 bg-[var(--danger-soft)] text-[var(--danger)]"
        onClick={onEndGame}
        title="End game"
        type="button"
      >
        <Flag className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
