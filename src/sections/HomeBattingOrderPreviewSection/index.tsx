import { ArrowDown, BarChart3, GripVertical, Medal, Sparkles } from "lucide-react";
import { MetricTile } from "@/components/MetricTile";
import { PreviewShell } from "@/components/PreviewShell";
import { SectionHeading } from "@/components/SectionHeading";
import { StatusPill } from "@/components/StatusPill";

const orderRows = [
  ["1", "Maya Johnson", "Table-setter", ".714 OBP"],
  ["2", "Jordan Lee", "Best overall hitter", "1.122 OPS"],
  ["3", "Alex Smith", "Contact + RBI", ".642 AVG"],
  ["4", "Sam Green", "Power damage", "1.030 SLG"],
  ["5", "Riley Park", "Next power bat", "7 XBH"],
  ["10", "Noa Cohen", "Second leadoff", "Fast"],
];

const rankingRules = ["OBP first", "Out rate matters", "SLG behind table-setters"];

export function HomeBattingOrderPreviewSection() {
  return (
    <section className="bg-[var(--surface)] py-10 sm:py-14">
      <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 sm:px-6 lg:grid-cols-[1.12fr_0.88fr] lg:px-8">
        <PreviewShell
          title="Batting Order"
          subtitle="Slowpitch recommendation preview"
          status="Static"
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <MetricTile label="Best OBP" value="Maya" helper="Leadoff" tone="accent" />
            <MetricTile label="Power slot" value="Sam" helper="#4 hitter" tone="warning" />
            <MetricTile label="Turnover" value="Noa" helper="#10 hitter" tone="success" />
          </div>

          <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                  Suggested lineup
                </p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  Based on simple stats, shown as non-functional guidance.
                </p>
              </div>
              <Medal className="size-5 text-[var(--accent)]" />
            </div>
            <div className="mt-3 space-y-2">
              {orderRows.map(([spot, name, role, signal]) => (
                <div
                  className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-lg bg-[var(--card)] px-3 py-2.5 shadow-sm shadow-foreground/[0.02]"
                  key={`${spot}-${name}`}
                >
                  <span className="flex size-8 items-center justify-center rounded-full bg-[var(--accent-soft)] text-xs font-bold text-[var(--accent)]">
                    {spot}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {name}
                    </p>
                    <p className="truncate text-xs text-[var(--muted-foreground)]">
                      {role}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-[var(--surface)] px-2.5 py-1 text-xs font-bold text-foreground">
                      {signal}
                    </span>
                    <GripVertical className="size-4 text-[var(--muted-foreground)]" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </PreviewShell>

        <div>
          <SectionHeading
            aside={<StatusPill tone="hold">Rules not active</StatusPill>}
            eyebrow="Order logic"
            title="Simple stats shape the planned recommendation."
            description="The page shows the amateur slowpitch principle without calculating or ranking live data: OBP and low outs up top, power behind them, weakest hitters lower, and a second leadoff at the turn."
          />

          <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm shadow-foreground/[0.035]">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]">
                <Sparkles className="size-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Slowpitch priorities
                </p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  No bat speed, exit velocity, or pitch-type metrics.
                </p>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {rankingRules.map((rule, index) => (
                <div
                  className="flex items-center gap-3 rounded-lg bg-[var(--surface)] px-3 py-2.5 text-sm font-semibold text-foreground"
                  key={rule}
                >
                  {index === 0 ? (
                    <BarChart3 className="size-4 text-[var(--accent)]" />
                  ) : (
                    <ArrowDown className="size-4 text-[var(--accent)]" />
                  )}
                  {rule}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
