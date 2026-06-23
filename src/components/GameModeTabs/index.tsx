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
              "btn-base min-h-11 px-3 text-sm",
              isActive
                ? "btn-choice-selected"
                : "btn-secondary",
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
        className="btn-base btn-danger-secondary size-11 min-h-0 p-0"
        onClick={onEndGame}
        title="End game"
        type="button"
      >
        <Flag className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
