import {
  Activity,
  CalendarClock,
  ChevronRight,
  ListOrdered,
  Plus,
  UsersRound,
} from "lucide-react";
import { MetricTile } from "@/components/MetricTile";
import { PreviewShell } from "@/components/PreviewShell";
import { SectionHeading } from "@/components/SectionHeading";
import { StatusPill } from "@/components/StatusPill";

const navItems = [
  { label: "Roster", icon: UsersRound, active: true },
  { label: "Game", icon: CalendarClock, active: false },
  { label: "Order", icon: ListOrdered, active: false },
  { label: "Stats", icon: Activity, active: false },
];

const teamCards = [
  ["Active roster", "14", "4 bats marked hot"],
  ["Next game", "Today", "vs Rebels"],
  ["Lineup size", "10", "Everyone bats"],
];

const activityRows = [
  ["Maya Johnson", "High OBP table-setter", ".714 OBP"],
  ["Jordan Lee", "Gap power, RBI spot", "1.122 OPS"],
  ["Sam Green", "Second leadoff type", "Fast"],
];

export function HomeDashboardPreviewSection() {
  return (
    <section className="bg-background py-10 sm:py-14">
      <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 sm:px-6 lg:grid-cols-[0.82fr_1.18fr] lg:px-8">
        <SectionHeading
          eyebrow="Team dashboard"
          title="The first screen feels like the app, not a placeholder."
          description="The static dashboard shows the four core destinations, current team context, and a compact readiness view using the Stitch-informed green surface."
          aside={<StatusPill tone="planned">Preview only</StatusPill>}
        />

        <PreviewShell
          title="Your Team Hub"
          subtitle="Mobile dashboard preview"
          status="Display"
        >
          <div className="grid gap-3 sm:grid-cols-3">
            {teamCards.map(([label, value, helper], index) => (
              <MetricTile
                helper={helper}
                key={label}
                label={label}
                tone={index === 0 ? "accent" : "default"}
                value={value}
              />
            ))}
          </div>

          <div className="mt-3 rounded-lg bg-[var(--surface)] p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                  Game flow
                </p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  Build roster, select lineup, review order, enter stats.
                </p>
              </div>
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[var(--accent)] text-white">
                <Plus className="size-5" aria-hidden="true" />
              </span>
            </div>
          </div>

          <div className="mt-3 grid gap-3 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                App nav
              </p>
              <div className="mt-3 grid grid-cols-4 gap-2">
                {navItems.map(({ label, icon: Icon, active }) => (
                  <span
                    className={
                      active
                        ? "flex min-h-16 flex-col items-center justify-center gap-1 rounded-lg bg-[var(--accent)] text-xs font-bold text-white"
                        : "flex min-h-16 flex-col items-center justify-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--card)] text-xs font-bold text-[var(--muted-foreground)]"
                    }
                    key={label}
                  >
                    <Icon className="size-5" aria-hidden="true" />
                    {label}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                Player card signals
              </p>
              <div className="mt-3 space-y-2">
                {activityRows.map(([name, role, signal]) => (
                  <div
                    className="flex items-center justify-between gap-3 rounded-lg bg-[var(--card)] px-3 py-2.5 shadow-sm shadow-foreground/[0.02]"
                    key={name}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {name}
                      </p>
                      <p className="truncate text-xs text-[var(--muted-foreground)]">
                        {role}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-xs font-bold text-[var(--accent)]">
                        {signal}
                      </span>
                      <ChevronRight className="size-4 text-[var(--muted-foreground)]" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </PreviewShell>
      </div>
    </section>
  );
}
