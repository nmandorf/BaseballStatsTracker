"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  CalendarDays,
  CircleDotDashed,
  ClipboardList,
  Home,
  Settings2,
} from "lucide-react";
import { AuthStatus } from "@/components/AuthStatus";
import { StatusPill } from "@/components/StatusPill";
import { getLiveGameHref } from "@/lib/gameEngine";
import { useFirstGameState } from "@/lib/useFirstGameState";
import { cn } from "@/lib/utils";

const navItems = [
  { key: "home", label: "Home", href: "/", icon: Home },
  { key: "roster", label: "Roster", href: "/roster", icon: ClipboardList },
  { key: "schedule", label: "Schedule", href: "/schedule", icon: CalendarDays },
  { key: "settings", label: "Game Settings", href: "/game-settings", icon: Settings2 },
  { key: "stats", label: "Stats", href: "/stats", icon: BarChart3 },
] as const;

const liveGamePaths = new Set(["/stats-entry", "/defense"]);

export type AppNavKey = (typeof navItems)[number]["key"];

type HeaderSectionProps = {
  activeNav?: AppNavKey | null;
};

export function HeaderSection({ activeNav = "home" }: HeaderSectionProps) {
  const activeMobileNavItemRef = useRef<HTMLAnchorElement>(null);
  const gameState = useFirstGameState();
  const pathname = usePathname();
  const router = useRouter();
  const isLiveGame = gameState.status === "IN_PROGRESS";

  useEffect(() => {
    if (!isLiveGame || (pathname && liveGamePaths.has(pathname))) {
      return;
    }

    router.replace(getLiveGameHref(gameState));
  }, [gameState, isLiveGame, pathname, router]);

  useEffect(() => {
    if (isLiveGame) {
      return;
    }

    activeMobileNavItemRef.current?.scrollIntoView({
      block: "nearest",
      inline: "nearest",
    });
  }, [activeNav, isLiveGame]);

  return (
    <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-background/94 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8 xl:grid xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
        <div className="flex min-w-0 items-center gap-3 xl:justify-self-start">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-[var(--accent)] text-white shadow-sm shadow-[var(--accent)]/20">
            <CircleDotDashed className="size-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">
              Baseball Stat Tracker
            </p>
            <p className="text-xs text-[var(--muted-foreground)]">
              Game day workspace
            </p>
          </div>
        </div>
        {!isLiveGame ? (
          <nav
            aria-label="Primary"
            className="hidden items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--card)] p-1 shadow-sm shadow-foreground/[0.025] xl:flex"
          >
            {navItems.map(({ key, label, href, icon: Icon }) => {
              const isActive = activeNav === key;

              return (
                <Link
                  className={cn(
                    "inline-flex min-h-12 items-center gap-2 rounded-md px-3 text-sm font-bold transition",
                    isActive
                      ? "bg-[var(--accent)] text-white"
                      : "text-[var(--muted-foreground)] hover:bg-[var(--surface)] hover:text-foreground",
                  )}
                  href={href}
                  key={key}
                >
                  <Icon className="size-4" aria-hidden="true" />
                  {label}
                </Link>
              );
            })}
          </nav>
        ) : null}
        <div className="flex items-center gap-2 xl:col-start-3 xl:justify-self-end">
          {isLiveGame ? <StatusPill tone="ready">Game in progress</StatusPill> : null}
          {!isLiveGame ? <AuthStatus /> : null}
        </div>
      </div>
      {!isLiveGame ? (
        <nav
          aria-label="Mobile primary"
          className="mx-auto flex w-full max-w-6xl gap-1 overflow-x-auto px-4 pb-3 sm:px-6 xl:hidden"
        >
          {navItems.map(({ key, label, href, icon: Icon }) => {
            const isActive = activeNav === key;

            return (
              <Link
                className={cn(
                  "inline-flex min-h-12 shrink-0 items-center gap-2 rounded-lg border px-3 text-sm font-bold",
                  isActive
                    ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                    : "border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)]",
                )}
                href={href}
                key={key}
                ref={isActive ? activeMobileNavItemRef : undefined}
              >
                <Icon className="size-4" aria-hidden="true" />
                {label}
              </Link>
            );
          })}
        </nav>
      ) : null}
    </header>
  );
}
