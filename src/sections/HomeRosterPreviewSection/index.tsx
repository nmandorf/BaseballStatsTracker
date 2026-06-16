import { CheckCircle2, Circle, NotebookText, UserRound } from "lucide-react";
import { MetricTile } from "@/components/MetricTile";
import { PreviewShell } from "@/components/PreviewShell";
import { SectionHeading } from "@/components/SectionHeading";
import { StatusPill } from "@/components/StatusPill";

const rosterPlayers = [
  {
    name: "Maya Johnson",
    role: "High OBP table-setter",
    bats: "L",
    speed: "Fast",
    active: true,
  },
  {
    name: "Jordan Lee",
    role: "Power hitter",
    bats: "R",
    speed: "Average",
    active: true,
  },
  {
    name: "Noa Cohen",
    role: "Contact hitter",
    bats: "S",
    speed: "Average",
    active: false,
  },
];

const noteTags = ["Hits gaps", "Good runner", "Can go opposite field"];

export function HomeRosterPreviewSection() {
  return (
    <section className="bg-[var(--surface)] py-10 sm:py-14">
      <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 sm:px-6 lg:grid-cols-[1.06fr_0.94fr] lg:px-8">
        <PreviewShell title="Roster" subtitle="Player card workflow" status="Static">
          <div className="grid gap-3 sm:grid-cols-3">
            <MetricTile label="Players" value="14" helper="Permanent roster" />
            <MetricTile label="Active" value="10" helper="Game selection" tone="success" />
            <MetricTile label="Profiles" value="Cards" helper="Fast edits" tone="accent" />
          </div>

          <div className="mt-3 space-y-2">
            {rosterPlayers.map((player) => (
              <div
                className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3"
                key={player.name}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]">
                      <UserRound className="size-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {player.name}
                      </p>
                      <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                        {player.role}
                      </p>
                    </div>
                  </div>
                  {player.active ? (
                    <CheckCircle2 className="size-5 text-[var(--success)]" />
                  ) : (
                    <Circle className="size-5 text-[var(--muted-foreground)]" />
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
                  <span className="rounded-full bg-[var(--card)] px-2.5 py-1 text-foreground">
                    Bats {player.bats}
                  </span>
                  <span className="rounded-full bg-[var(--card)] px-2.5 py-1 text-foreground">
                    {player.speed}
                  </span>
                  <span className="rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-[var(--accent)]">
                    {player.active ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </PreviewShell>

        <SectionHeading
          align="between"
          aside={<StatusPill tone="hold">No saves yet</StatusPill>}
          eyebrow="Roster screen"
          title="Player cards carry simple softball context."
          description="The roster preview follows the planned fields: bats, speed, role language, notes, and active status. The controls are visual only until the roster OpenSpec change exists."
        />

        <div className="lg:col-start-2">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm shadow-foreground/[0.035]">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-lg bg-[var(--surface)] text-[var(--accent)]">
                <NotebookText className="size-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Simple player notes
                </p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  Contact quality, speed, and lineup role hints.
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {noteTags.map((tag) => (
                <span
                  className="rounded-full bg-[var(--accent-soft)] px-3 py-1.5 text-xs font-bold text-[var(--accent)]"
                  key={tag}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
