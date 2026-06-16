import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  CircleDot,
  RotateCcw,
  Save,
  UserPlus,
} from "lucide-react";
import { SectionHeading } from "@/components/SectionHeading";
import { StatusPill } from "@/components/StatusPill";

const screenLayout = [
  "Game situation header",
  "Batting order strip",
  "Current batter card",
  "Batter result buttons",
  "Compact runners-on-base panel",
  "RBI controls only when scored",
  "After-play summary",
  "Undo / Save Play + Next Batter",
];

const resultButtons = ["1B", "2B", "3B", "HR", "BB", "ROE", "FC", "SF", "Out", "DP"];

const runnerRows = [
  {
    base: "1B",
    runner: "Maya Johnson",
    movement: "To 3B",
    helper: "Original runner",
    action: "Use Pinch Runner",
  },
  {
    base: "2B",
    runner: "Sam Green",
    movement: "Scores",
    helper: "Pinch running for Alex Smith",
    action: "Change / Remove",
  },
];

const saveSteps = [
  "Batter result",
  "Runner movement",
  "Pinch runner event",
  "Score, outs, and bases",
  "Batter, runner, and RBI stats",
  "Next batter loop",
];

export function HomeLiveEntryDirectionSection() {
  return (
    <section id="live-entry" className="bg-background py-10 sm:py-14">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          align="between"
          aside={<StatusPill tone="hold">UI direction only</StatusPill>}
          eyebrow="Live entry direction"
          title="Runner movement stays on the current batter screen."
          description="The preview follows the Stitch-style mobile flow: tap the result, confirm only occupied bases, use pinch runner controls inline, show RBI only after a run, then save and move on."
        />

        <div className="mt-6 grid gap-4 lg:grid-cols-[0.82fr_1.18fr]">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm shadow-foreground/[0.035]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                  Screen order
                </p>
                <h3 className="mt-1 text-lg font-semibold text-foreground">
                  Stats Entry layout
                </h3>
              </div>
              <CheckCircle2
                className="size-5 text-[var(--accent)]"
                aria-hidden="true"
              />
            </div>

            <ol className="mt-4 space-y-2">
              {screenLayout.map((item, index) => (
                <li
                  className="flex items-center gap-3 rounded-lg bg-[var(--surface)] px-3 py-2.5 text-sm font-semibold text-foreground"
                  key={item}
                >
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--card)] text-xs font-bold text-[var(--accent)]">
                    {index + 1}
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3 shadow-xl shadow-foreground/[0.06]">
            <div className="rounded-lg bg-[var(--accent-strong)] p-4 text-white">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/65">
                    Top 3 | 1 out | Bases active
                  </p>
                  <h3 className="mt-1 text-xl font-semibold">Jordan Lee at bat</h3>
                </div>
                <div className="rounded-lg bg-white/12 px-3 py-2 text-right text-xs font-bold">
                  <p>MAV 6</p>
                  <p>REB 4</p>
                </div>
              </div>
            </div>

            <div className="mt-3 grid gap-3 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                  Result buttons
                </p>
                <div className="mt-3 grid grid-cols-5 gap-2">
                  {resultButtons.map((result) => (
                    <span
                      className={
                        result === "2B"
                          ? "flex min-h-10 items-center justify-center rounded-lg bg-[var(--accent)] text-sm font-bold text-white shadow-sm shadow-[var(--accent)]/20"
                          : "flex min-h-10 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--card)] text-sm font-bold text-foreground shadow-sm shadow-foreground/[0.02]"
                      }
                      key={result}
                    >
                      {result}
                    </span>
                  ))}
                </div>

                <div className="mt-3 rounded-lg bg-[var(--surface)] p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                    After-play summary
                  </p>
                  <div className="mt-2 space-y-1 text-sm font-medium text-foreground">
                    <p>Sam scores from 2B</p>
                    <p>Maya moves from 1B to 3B</p>
                    <p>Jordan reaches 2B</p>
                  </div>
                  <p className="mt-3 text-xs font-bold text-[var(--accent)]">
                    Runs +1 | Outs unchanged | RBI Jordan +1
                  </p>
                </div>

                <div className="mt-3 rounded-lg bg-[var(--card)] p-3 shadow-sm shadow-foreground/[0.02]">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                    Updated diamond
                  </p>
                  <div className="relative mx-auto mt-3 aspect-square max-w-56 rounded-lg bg-[var(--surface)]">
                    <span className="absolute left-1/2 top-4 flex -translate-x-1/2 items-center gap-1 rounded-full bg-[var(--card)] px-2.5 py-1 text-xs font-bold text-foreground">
                      Jordan 2B
                    </span>
                    <span className="absolute right-4 top-1/2 flex -translate-y-1/2 items-center gap-1 rounded-full bg-[var(--card)] px-2.5 py-1 text-xs font-bold text-[var(--muted-foreground)]">
                      Empty 1B
                    </span>
                    <span className="absolute left-4 top-1/2 flex -translate-y-1/2 items-center gap-1 rounded-full bg-[var(--card)] px-2.5 py-1 text-xs font-bold text-foreground">
                      Maya 3B
                    </span>
                    <span className="absolute bottom-4 left-1/2 flex -translate-x-1/2 rounded-full bg-[var(--accent)] px-3 py-1 text-xs font-bold text-white">
                      Sam scored
                    </span>
                    <span className="absolute left-1/2 top-1/2 size-20 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-lg border-2 border-[var(--accent)]/45" />
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                    Runners on base
                  </p>
                  <StatusPill tone="planned">Auto-filled</StatusPill>
                </div>

                <div className="mt-3 space-y-2">
                  {runnerRows.map((row) => (
                    <div
                      className="rounded-lg bg-[var(--card)] p-3 shadow-sm shadow-foreground/[0.02]"
                      key={row.base}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {row.base}: {row.runner}
                          </p>
                          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                            {row.helper}
                          </p>
                        </div>
                        <span className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs font-bold text-foreground">
                          <span className="inline-flex items-center gap-1">
                            {row.movement}
                            <ChevronDown className="size-3" aria-hidden="true" />
                          </span>
                        </span>
                      </div>
                      <div className="mt-3 flex items-center gap-2 text-xs font-bold text-[var(--accent)]">
                        <UserPlus className="size-4" aria-hidden="true" />
                        {row.action}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-3 rounded-lg bg-[var(--accent-soft)] p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--accent)]">
                    RBI controls
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[var(--accent-strong)]">
                    Sam scored. Credit RBI to Jordan?
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs font-bold">
                    <span className="rounded-lg bg-[var(--accent)] px-3 py-2 text-white">
                      Yes
                    </span>
                    <span className="rounded-lg bg-[var(--card)] px-3 py-2 text-foreground">
                      No
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-[0.7fr_1.3fr] gap-2">
              <span className="flex min-h-12 items-center justify-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] text-sm font-bold text-foreground">
                <RotateCcw className="size-4" aria-hidden="true" />
                Undo
              </span>
              <span className="flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[var(--accent)] text-sm font-bold text-white shadow-sm shadow-[var(--accent)]/20">
                <Save className="size-4" aria-hidden="true" />
                Save Play + Next Batter
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm shadow-foreground/[0.035]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                Save boundary
              </p>
              <p className="mt-2 text-sm font-semibold text-foreground">
                These are the records the approved feature will eventually save.
                This page still does not write or calculate anything.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-[var(--accent)]">
              {["Result", "Runners", "RBI", "Save"].map((item, index, items) => (
                <div className="flex items-center gap-2" key={item}>
                  <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1.5">
                    {item}
                  </span>
                  {index < items.length - 1 ? (
                    <ArrowRight className="size-3" aria-hidden="true" />
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {saveSteps.map((step) => (
              <div
                className="flex items-center gap-2 rounded-lg bg-[var(--surface)] px-3 py-2 text-sm font-semibold text-foreground"
                key={step}
              >
                <CircleDot
                  className="size-4 shrink-0 text-[var(--accent)]"
                  aria-hidden="true"
                />
                <span>{step}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
