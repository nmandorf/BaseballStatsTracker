import type { RefObject } from "react";
import Link from "next/link";
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
import { cn } from "@/lib/utils";

const navItems = [
  { key: "home", label: "Home", href: "/", icon: Home },
  { key: "roster", label: "Roster", href: "/roster", icon: ClipboardList },
  {
    key: "schedule",
    label: "Schedule",
    href: "/schedule",
    icon: CalendarDays,
  },
  {
    key: "settings",
    label: "Game Settings",
    href: "/game-settings",
    icon: Settings2,
  },
  { key: "stats", label: "Stats", href: "/stats", icon: BarChart3 },
] as const;

export type AppNavKey = (typeof navItems)[number]["key"];

export function HeaderBrand() {
  return (
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
  );
}

export function DesktopPrimaryNav({
  activeNav,
  isLiveGame,
}: {
  activeNav: AppNavKey | null;
  isLiveGame: boolean;
}) {
  if (isLiveGame) {
    return null;
  }

  return (
    <nav
      aria-label="Primary"
      className="hidden items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--card)] p-1 shadow-sm shadow-foreground/[0.025] xl:flex"
    >
      {navItems.map((item) => (
        <DesktopPrimaryNavItem
          activeNav={activeNav}
          item={item}
          key={item.key}
        />
      ))}
    </nav>
  );
}

function DesktopPrimaryNavItem({
  activeNav,
  item,
}: {
  activeNav: AppNavKey | null;
  item: (typeof navItems)[number];
}) {
  const Icon = item.icon;
  const isActive = activeNav === item.key;

  return (
    <Link
      className={cn(
        "inline-flex min-h-12 items-center gap-2 rounded-md px-3 text-sm font-bold transition",
        isActive
          ? "bg-[var(--accent)] text-white"
          : "text-[var(--muted-foreground)] hover:bg-[var(--surface)] hover:text-foreground",
      )}
      href={item.href}
    >
      <Icon className="size-4" aria-hidden="true" />
      {item.label}
    </Link>
  );
}

export function HeaderActions({ isLiveGame }: { isLiveGame: boolean }) {
  return (
    <div className="flex items-center gap-2 xl:col-start-3 xl:justify-self-end">
      {isLiveGame ? (
        <StatusPill tone="ready">Game in progress</StatusPill>
      ) : (
        <AuthStatus />
      )}
    </div>
  );
}

export function MobilePrimaryNav({
  activeMobileNavItemRef,
  activeNav,
  isLiveGame,
}: {
  activeMobileNavItemRef: RefObject<HTMLAnchorElement | null>;
  activeNav: AppNavKey | null;
  isLiveGame: boolean;
}) {
  if (isLiveGame) {
    return null;
  }

  return (
    <nav
      aria-label="Mobile primary"
      className="mx-auto flex w-full max-w-6xl gap-1 overflow-x-auto px-4 pb-3 sm:px-6 xl:hidden"
    >
      {navItems.map((item) => (
        <MobilePrimaryNavItem
          activeMobileNavItemRef={activeMobileNavItemRef}
          activeNav={activeNav}
          item={item}
          key={item.key}
        />
      ))}
    </nav>
  );
}

function MobilePrimaryNavItem({
  activeMobileNavItemRef,
  activeNav,
  item,
}: {
  activeMobileNavItemRef: RefObject<HTMLAnchorElement | null>;
  activeNav: AppNavKey | null;
  item: (typeof navItems)[number];
}) {
  const Icon = item.icon;
  const isActive = activeNav === item.key;

  return (
    <Link
      className={cn(
        "inline-flex min-h-12 shrink-0 items-center gap-2 rounded-lg border px-3 text-sm font-bold",
        isActive
          ? "border-[var(--accent)] bg-[var(--accent)] text-white"
          : "border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)]",
      )}
      href={item.href}
      ref={isActive ? activeMobileNavItemRef : undefined}
    >
      <Icon className="size-4" aria-hidden="true" />
      {item.label}
    </Link>
  );
}
