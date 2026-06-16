import Link from "next/link";
import {
  BarChart3,
  CircleDotDashed,
  ClipboardList,
  Home,
  ListOrdered,
  Menu,
  Settings2,
} from "lucide-react";
import { AuthStatus } from "@/components/AuthStatus";
import { StatusPill } from "@/components/StatusPill";
import { cn } from "@/lib/utils";

const navItems = [
  { key: "home", label: "Home", href: "/", icon: Home },
  { key: "roster", label: "Roster", href: "/roster", icon: ClipboardList },
  { key: "game", label: "Game", href: "/game-setup", icon: Settings2 },
  { key: "order", label: "Order", href: "/batting-order", icon: ListOrdered },
  { key: "stats", label: "Stats", href: "/stats", icon: BarChart3 },
] as const;

export type AppNavKey = (typeof navItems)[number]["key"];

type HeaderSectionProps = {
  activeNav?: AppNavKey;
};

export function HeaderSection({ activeNav = "home" }: HeaderSectionProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-background/94 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/"
            aria-label="Baseball Stat Tracker home"
            className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-[var(--accent)] text-white shadow-sm shadow-[var(--accent)]/20"
          >
            <CircleDotDashed className="size-5" aria-hidden="true" />
          </Link>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">
              Baseball Stat Tracker
            </p>
            <p className="text-xs text-[var(--muted-foreground)]">
              Kobe&apos;s Peeps game day
            </p>
          </div>
        </div>
        <nav
          aria-label="Primary"
          className="hidden items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--card)] p-1 shadow-sm shadow-foreground/[0.025] md:flex"
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
        <div className="flex items-center gap-2">
          <StatusPill className="hidden sm:inline-flex" tone="ready">
            Game day
          </StatusPill>
          <AuthStatus />
          <span
            className="hidden size-12 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)] shadow-sm shadow-foreground/[0.025] sm:flex"
            aria-hidden="true"
          >
            <Menu className="size-5" aria-hidden="true" />
          </span>
        </div>
      </div>
      <nav
        aria-label="Mobile primary"
        className="mx-auto flex w-full max-w-6xl gap-1 overflow-x-auto px-4 pb-3 sm:px-6 md:hidden"
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
            >
              <Icon className="size-4" aria-hidden="true" />
              {label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
