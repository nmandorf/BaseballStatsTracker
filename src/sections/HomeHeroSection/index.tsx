import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  ClipboardList,
  ExternalLink,
  ListOrdered,
  MapPin,
  RefreshCw,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { StatusPill } from "@/components/StatusPill";
import type { QuickScoresSchedule } from "@/lib/quickscoresSchedule";

type HomeHeroSectionProps = {
  schedule: QuickScoresSchedule;
};

const secondaryActions = [
  { href: "/batting-order", label: "Review Lineup", icon: ListOrdered },
  { href: "/roster", label: "Edit Roster", icon: ClipboardList },
];

export function HomeHeroSection({ schedule }: HomeHeroSectionProps) {
  const game = schedule.game;
  const statusLabel =
    schedule.status === "ready"
      ? "Next game"
      : schedule.status === "bye"
        ? "Bye week"
        : "Schedule fallback";

  return (
    <section className="min-h-[calc(100vh-9rem)] bg-background py-5 sm:py-8">
      <div className="mx-auto grid w-full max-w-6xl gap-4 px-4 sm:px-6 lg:grid-cols-[0.72fr_0.28fr] lg:px-8">
        <article className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm shadow-foreground/[0.025] sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-bold text-[var(--accent)]">
                Kobe&apos;s Peeps
              </p>
              <h1 className="mt-1 text-2xl font-semibold leading-tight text-foreground sm:text-3xl">
                Game day
              </h1>
            </div>
            <StatusPill tone={schedule.status === "ready" ? "ready" : "hold"}>
              {statusLabel}
            </StatusPill>
          </div>

          <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
            <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-start">
              <div className="min-w-0">
                <p className="text-sm font-bold text-[var(--muted-foreground)]">
                  Opponent
                </p>
                <h2 className="mt-1 text-3xl font-semibold leading-tight text-foreground sm:text-4xl">
                  {game ? game.opponent : "No game loaded"}
                </h2>
                <p className="mt-2 text-sm font-semibold text-[var(--muted-foreground)]">
                  {schedule.note}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:min-w-72">
                <GameDetail
                  icon={CalendarClock}
                  label="Time"
                  value={game ? `${game.dateLabel}, ${game.timeLabel}` : "Check schedule"}
                />
                <GameDetail
                  icon={MapPin}
                  label="Field"
                  value={game?.field ?? "Field TBD"}
                />
              </div>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <GameStatus label="Side" value={game ? (game.isHome ? "Home" : "Away") : "TBD"} />
              <GameStatus label="Source" value="QuickScores" />
              <GameStatus label="Updated" value={game?.fetchedAt ?? "Not synced"} />
            </div>
          </div>

          <div className="mt-4 grid gap-2">
            <Link
              className="inline-flex min-h-14 items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-4 text-base font-bold text-white shadow-sm shadow-[var(--accent)]/20 transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
              href="/game-setup"
            >
              <ShieldCheck className="size-4" aria-hidden="true" />
              Start Game
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>

            <div className="grid gap-2 sm:grid-cols-2">
              {secondaryActions.map(({ href, label, icon: Icon }) => (
                <Link
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 text-sm font-bold text-[var(--muted-foreground)] transition hover:bg-[var(--surface)] hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
                  href={href}
                  key={href}
                >
                  <Icon className="size-4" aria-hidden="true" />
                  {label}
                </Link>
              ))}
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2 rounded-lg border border-[var(--border)] bg-[var(--background)] p-3 text-sm text-[var(--muted-foreground)] sm:flex-row sm:items-center sm:justify-between">
            <span className="inline-flex items-center gap-2 font-semibold">
              <RefreshCw className="size-4" aria-hidden="true" />
              Public schedule read-only
            </span>
            <a
              className="inline-flex min-h-12 items-center gap-1 rounded-md px-2 font-bold text-[var(--accent)]"
              href={game?.sourceUrl ?? "https://www.quickscores.com/Orgs/ResultsDisplay.php?OrgDir=sanmateo&LeagueID=1717026&TeamID=15063981"}
              rel="noreferrer"
              target="_blank"
            >
              View QuickScores
              <ExternalLink className="size-3.5" aria-hidden="true" />
            </a>
          </div>
        </article>

        <aside className="grid gap-4 lg:content-start">
          <article className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm shadow-foreground/[0.025]">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]">
                <UserCheck className="size-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-bold text-foreground">Next step</p>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Confirm active players.
                </p>
              </div>
            </div>
          </article>

          <article className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm shadow-foreground/[0.025]">
            <p className="text-sm font-bold text-foreground">Game checklist</p>
            <div className="mt-3 grid gap-2">
              {["Lineup", "Roster", "Rules"].map((item) => (
                <div
                  className="flex min-h-12 items-center justify-between rounded-lg bg-[var(--surface)] px-3 text-sm font-semibold text-foreground"
                  key={item}
                >
                  <span>{item}</span>
                  <span className="text-[var(--muted-foreground)]">Ready</span>
                </div>
              ))}
            </div>
          </article>
        </aside>
      </div>
    </section>
  );
}

type DetailProps = {
  icon: typeof CalendarClock;
  label: string;
  value: string;
};

function GameDetail({ icon: Icon, label, value }: DetailProps) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3">
      <Icon className="size-4 text-[var(--accent)]" aria-hidden="true" />
      <p className="mt-2 text-xs font-bold text-[var(--muted-foreground)]">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold leading-5 text-foreground">
        {value}
      </p>
    </div>
  );
}

type GameStatusProps = {
  label: string;
  value: string;
};

function GameStatus({ label, value }: GameStatusProps) {
  return (
    <div className="rounded-lg bg-[var(--card)] px-3 py-2">
      <p className="text-xs font-bold text-[var(--muted-foreground)]">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}
