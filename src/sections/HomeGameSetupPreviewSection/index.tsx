import {
  CalendarDays,
  Check,
  Home,
  Settings2,
  ToggleRight,
  UsersRound,
} from "lucide-react";
import { MetricTile } from "@/components/MetricTile";
import { PreviewShell } from "@/components/PreviewShell";
import { SectionHeading } from "@/components/SectionHeading";
import { StatusPill } from "@/components/StatusPill";

const selectedPlayers = [
  "Maya",
  "Jordan",
  "Sam",
  "Alex",
  "Noa",
  "Riley",
  "Casey",
  "Drew",
  "Ari",
  "Taylor",
];

const ruleRows = [
  ["Home run limit", "3", true],
  ["Walks allowed", "Yes", true],
  ["Sac flies tracked", "Yes", true],
  ["Errors tracked", "Yes", true],
  ["Run limit per inning", "5", false],
];

export function HomeGameSetupPreviewSection() {
  return (
    <section className="bg-background py-10 sm:py-14">
      <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:px-8">
        <SectionHeading
          aside={<StatusPill tone="planned">Pregame preview</StatusPill>}
          eyebrow="Game setup"
          title="Pregame selection is compact enough for the dugout."
          description="The setup screen shows opponent, date, home/away, active players, lineup size, and league-rule switches without turning them into saved game state yet."
        />

        <PreviewShell title="Game Setup" subtitle="Rebels at your team" status="Static">
          <div className="grid gap-3 sm:grid-cols-3">
            <MetricTile label="Opponent" value="Rebels" helper="Today" tone="accent" />
            <MetricTile label="Side" value="Home" helper="Bat last" />
            <MetricTile label="Lineup" value="10" helper="Everyone bats" tone="success" />
          </div>

          <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_1fr]">
            <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                    Game details
                  </p>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    Ready for lineup review
                  </p>
                </div>
                <CalendarDays className="size-5 text-[var(--accent)]" />
              </div>
              <div className="mt-3 grid gap-2">
                {[
                  ["Date", "June 4"],
                  ["Opponent", "Rebels"],
                  ["Home / away", "Home"],
                ].map(([label, value]) => (
                  <div
                    className="flex items-center justify-between gap-3 rounded-lg bg-[var(--card)] px-3 py-2.5 text-sm"
                    key={label}
                  >
                    <span className="font-medium text-[var(--muted-foreground)]">
                      {label}
                    </span>
                    <span className="font-semibold text-foreground">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                    Active players
                  </p>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    10 selected
                  </p>
                </div>
                <UsersRound className="size-5 text-[var(--accent)]" />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedPlayers.map((player) => (
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full bg-[var(--card)] px-2.5 py-1.5 text-xs font-bold text-foreground"
                    key={player}
                  >
                    <Check className="size-3 text-[var(--success)]" aria-hidden="true" />
                    {player}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                  League rules
                </p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  Clear switches for the rules that affect scoring later.
                </p>
              </div>
              <Settings2 className="size-5 text-[var(--accent)]" />
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {ruleRows.map(([label, value, enabled]) => (
                <div
                  className="flex items-center justify-between gap-3 rounded-lg bg-[var(--card)] px-3 py-2.5 text-sm"
                  key={String(label)}
                >
                  <span className="font-semibold text-foreground">{label}</span>
                  <span className="inline-flex items-center gap-2 font-bold text-[var(--accent)]">
                    {value}
                    {enabled ? <ToggleRight className="size-5" /> : <Home className="size-4" />}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </PreviewShell>
      </div>
    </section>
  );
}
