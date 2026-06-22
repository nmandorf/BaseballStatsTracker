import type { LucideIcon } from "lucide-react";
import { Activity, CircleDot, Gauge, UserRound } from "lucide-react";
import { StatusPill } from "@/components/StatusPill";

type PlayerCardProps = {
  name: string;
  role: string;
  gender: string;
  bats: string;
  position: string;
  speed: string;
  stats: Array<{ label: string; value: string }>;
  defenseStats?: Array<{ label: string; value: string }>;
  defenseLabel?: string;
  defenseEvidence?: string;
  defenseNote?: string;
  note: string;
  status?: string;
  icon?: LucideIcon;
};

export function PlayerCard({
  name,
  role,
  gender,
  bats,
  position,
  speed,
  stats,
  defenseStats = [],
  defenseLabel,
  defenseEvidence,
  defenseNote,
  note,
  status = "Active",
  icon: Icon = UserRound,
}: PlayerCardProps) {
  return (
    <article className="flex h-full flex-col rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm shadow-foreground/[0.035]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold text-foreground">{name}</p>
          <p className="mt-1 truncate text-sm font-medium text-[var(--muted-foreground)]">
            {role}
          </p>
        </div>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]">
          <Icon className="size-5" aria-hidden="true" />
        </span>
      </div>

      <div className="mt-4 flex min-h-[4.5rem] content-start flex-wrap gap-2">
        <StatusPill tone="ready">{status}</StatusPill>
        <StatusPill tone={gender === "Unknown" ? "review" : "done"}>{gender}</StatusPill>
        <StatusPill tone="planned">Bats {bats}</StatusPill>
        <StatusPill tone={position ? "done" : "review"}>
          {position || "Defense unassigned"}
        </StatusPill>
        <StatusPill tone="stitch">{speed}</StatusPill>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {stats.map((stat) => (
          <div className="rounded-lg bg-[var(--surface)] px-3 py-2" key={stat.label}>
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.1em] text-[var(--muted-foreground)]">
              {stat.label}
            </p>
            <p className="mt-1 text-base font-semibold text-foreground">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {defenseStats.length ? (
        <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--card)] p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-bold text-foreground">
              {defenseLabel ?? "Defense"}
            </p>
            {defenseEvidence ? (
              <span className="shrink-0 rounded-full bg-[var(--accent-soft)] px-2 py-1 text-[0.65rem] font-bold text-[var(--accent)]">
                {defenseEvidence}
              </span>
            ) : null}
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {defenseStats.map((stat) => (
              <div className="rounded-lg bg-[var(--surface)] px-2 py-2" key={stat.label}>
                <p className="truncate text-[0.64rem] font-bold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">
                  {stat.label}
                </p>
                <p className="mt-1 truncate text-sm font-semibold text-foreground">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
          {defenseNote ? (
            <p className="mt-2 text-xs font-semibold text-[var(--muted-foreground)]">
              {defenseNote}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-4 flex gap-2 rounded-lg bg-[var(--surface)] p-3 text-sm text-[var(--muted-foreground)]">
        <CircleDot className="mt-0.5 size-4 shrink-0 text-[var(--accent)]" aria-hidden="true" />
        <p className="min-h-10 overflow-hidden [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">{note}</p>
      </div>

      <div className="mt-auto grid grid-cols-2 gap-2 pt-4 text-xs font-bold text-[var(--muted-foreground)]">
        <span className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2">
          <Gauge className="size-4 text-[var(--accent)]" aria-hidden="true" />
          Profile saved
        </span>
        <span className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2">
          <Activity className="size-4 text-[var(--accent)]" aria-hidden="true" />
          Stats tracked
        </span>
      </div>
    </article>
  );
}
