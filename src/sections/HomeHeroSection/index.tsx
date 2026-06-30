"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarClock, ClipboardList, MapPin, ShieldCheck } from "lucide-react";
import { AccountTeamsCard } from "@/components/AccountTeamsCard";
import { StatusPill } from "@/components/StatusPill";
import { formatCountdown } from "@/lib/countdownFormatting";
import { getNextScheduleWeeks, gameStartLeadTimeMs } from "@/lib/scheduleRules";
import { saveSelectedScheduledGameId } from "@/lib/scheduleClient";
import type { TeamSchedule } from "@/types/schedule";

export function HomeHeroSection({ schedule }: { schedule: TeamSchedule }) {
  const initialServerNow = useMemo(() => Date.parse(schedule.serverNow), [schedule.serverNow]);
  const [now, setNow] = useState(() => new Date(initialServerNow));

  useEffect(() => {
    const initialClientNow = Date.now();
    const timer = window.setInterval(() => setNow(new Date(initialServerNow + Date.now() - initialClientNow)), 1_000);
    return () => window.clearInterval(timer);
  }, [initialServerNow]);

  const { next, nextGame } = getNextScheduleWeeks(schedule.weeks, now, schedule.timeZone ?? "UTC");
  const game = next?.kind === "GAME" ? next : nextGame?.kind === "GAME" ? nextGame : null;
  const eligibleAt = game ? Date.parse(game.scheduledStartAt) - gameStartLeadTimeMs : Number.POSITIVE_INFINITY;
  const canStart = Boolean(game && game.status === "SCHEDULED" && now.getTime() >= eligibleAt);

  return (
    <section className="min-h-[calc(100vh-9rem)] bg-background py-5 sm:py-8">
      <div className="mx-auto grid w-full max-w-6xl gap-4 px-4 sm:px-6 lg:grid-cols-[0.72fr_0.28fr] lg:px-8">
        <article className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div><p className="text-sm font-bold text-[var(--accent)]">Baseball Stat Tracker</p><h1 className="mt-1 text-2xl font-semibold text-foreground sm:text-3xl">Game day</h1></div>
            <StatusPill tone={game ? "ready" : "hold"}>{next?.kind === "BYE" ? "Bye week" : game ? "Next game" : "Schedule complete"}</StatusPill>
          </div>

          {next?.kind === "BYE" ? <div className="mt-4 rounded-lg bg-[var(--warning-soft)] p-3 text-sm font-bold text-[var(--warning)]">Bye week · {formatDate(next.localDate)}</div> : null}

          <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
            {game ? <>
              <p className="text-sm font-bold text-[var(--muted-foreground)]">Opponent</p>
              <h2 className="mt-1 text-3xl font-semibold text-foreground sm:text-4xl">{game.opponent}</h2>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <GameDetail icon={CalendarClock} label="First pitch" value={`${formatDate(game.localDate)}, ${formatTime(game.startTime)}`} />
                <GameDetail icon={MapPin} label="Side" value={game.isHome ? "Home" : "Away"} />
              </div>
              <div className="mt-3 rounded-lg bg-[var(--card)] p-3 text-sm font-bold text-foreground">
                {canStart ? "Game may be started now" : `Starts in ${formatCountdown(eligibleAt - now.getTime())}`} · {formatPreparation(game.preparationStatus)}
              </div>
            </> : <><h2 className="text-2xl font-semibold text-foreground">Season schedule complete</h2><p className="mt-2 text-sm font-semibold text-[var(--muted-foreground)]">Add another week whenever the team schedules its next game.</p></>}
          </div>

          <div className="mt-4 grid gap-2">
            {game ? <Link className={`btn-base min-h-14 px-4 text-base ${canStart ? "btn-primary" : "btn-secondary text-[var(--muted-foreground)]"}`} href="/game-setup" onClick={() => saveSelectedScheduledGameId(schedule.teamId, game.gameId)}>
              <ShieldCheck className="size-4" />{canStart ? "Review Game Setup" : "Prepare Game"}
            </Link> : null}
            <div className="grid grid-cols-2 gap-2">
              <Link className="btn-base btn-secondary min-h-12 px-3 text-sm" href="/schedule">Manage Schedule</Link>
              <Link className="btn-base btn-secondary min-h-12 px-3 text-sm" href="/roster"><ClipboardList className="size-4" />Edit Roster</Link>
            </div>
          </div>
        </article>
        <aside><AccountTeamsCard /></aside>
      </div>
    </section>
  );
}

function GameDetail({ icon: Icon, label, value }: { icon: typeof CalendarClock; label: string; value: string }) { return <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3"><Icon className="size-4 text-[var(--accent)]" /><p className="mt-2 text-xs font-bold text-[var(--muted-foreground)]">{label}</p><p className="mt-1 text-sm font-semibold text-foreground">{value}</p></div>; }
function formatDate(date: string) { return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`)); }
function formatTime(time: string) { return `${Number(time.slice(0, 2)) - 12}:00 PM`; }
function formatPreparation(status: string) { return status === "ACCEPTED" ? "Lineup accepted" : status === "GENERATED" ? "Lineup generated" : "Lineup not ready"; }
