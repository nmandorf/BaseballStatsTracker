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

type PlayerCardStat = { label: string; value: string };

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
  const visibleNote = isImportSourceNote(note) ? "" : note.trim();

  return (
    <article className="flex h-full flex-col rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm shadow-foreground/[0.035]">
      <PlayerCardHeader Icon={Icon} name={name} role={role} />
      <PlayerCardPills bats={bats} gender={gender} position={position} speed={speed} status={status} />
      <PlayerStatGrid stats={stats} />
      <PlayerDefenseSummary defenseEvidence={defenseEvidence} defenseLabel={defenseLabel} defenseNote={defenseNote} defenseStats={defenseStats} />
      <PlayerVisibleNote note={visibleNote} />
      <PlayerCardFooter />
    </article>
  );
}

function PlayerCardHeader({
  Icon,
  name,
  role,
}: {
  Icon: LucideIcon;
  name: string;
  role: string;
}) {
  return (
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
  );
}

function PlayerCardPills({
  bats,
  gender,
  position,
  speed,
  status,
}: {
  bats: string;
  gender: string;
  position: string;
  speed: string;
  status: string;
}) {
  return (
    <div className="mt-4 flex min-h-[4.5rem] content-start flex-wrap gap-2">
      <StatusPill tone="ready">{status}</StatusPill>
      <StatusPill tone={gender === "Unknown" ? "review" : "done"}>{gender}</StatusPill>
      <StatusPill tone="planned">Bats {bats}</StatusPill>
      <StatusPill tone={position ? "done" : "review"}>
        {position || "Defense unassigned"}
      </StatusPill>
      <StatusPill tone="stitch">{speed}</StatusPill>
    </div>
  );
}

function PlayerStatGrid({ stats }: { stats: PlayerCardStat[] }) {
  return (
    <div className="mt-4 grid grid-cols-3 gap-2">
      {stats.map((stat) => (
        <PlayerStatTile key={stat.label} stat={stat} />
      ))}
    </div>
  );
}

function PlayerStatTile({ stat }: { stat: PlayerCardStat }) {
  return (
    <div className="rounded-lg bg-[var(--surface)] px-3 py-2">
      <p className="text-[0.68rem] font-bold uppercase tracking-[0.1em] text-[var(--muted-foreground)]">
        {stat.label}
      </p>
      <p className="mt-1 text-base font-semibold text-foreground">
        {stat.value}
      </p>
    </div>
  );
}

function PlayerDefenseSummary({
  defenseEvidence,
  defenseLabel,
  defenseNote,
  defenseStats,
}: {
  defenseEvidence?: string;
  defenseLabel?: string;
  defenseNote?: string;
  defenseStats: PlayerCardStat[];
}) {
  if (!defenseStats.length) {
    return null;
  }

  return (
    <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--card)] p-3">
      <PlayerDefenseHeader defenseEvidence={defenseEvidence} defenseLabel={defenseLabel} />
      <PlayerDefenseStatGrid stats={defenseStats} />
      <PlayerDefenseNote note={defenseNote} />
    </div>
  );
}

function PlayerDefenseHeader({
  defenseEvidence,
  defenseLabel,
}: {
  defenseEvidence?: string;
  defenseLabel?: string;
}) {
  return (
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
  );
}

function PlayerDefenseStatGrid({ stats }: { stats: PlayerCardStat[] }) {
  return (
    <div className="mt-2 grid grid-cols-3 gap-2">
      {stats.map((stat) => (
        <PlayerDefenseStatTile key={stat.label} stat={stat} />
      ))}
    </div>
  );
}

function PlayerDefenseStatTile({ stat }: { stat: PlayerCardStat }) {
  return (
    <div className="rounded-lg bg-[var(--surface)] px-2 py-2">
      <p className="truncate text-[0.64rem] font-bold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">
        {stat.label}
      </p>
      <p className="mt-1 truncate text-sm font-semibold text-foreground">
        {stat.value}
      </p>
    </div>
  );
}

function PlayerDefenseNote({ note }: { note?: string }) {
  if (!note) {
    return null;
  }

  return (
    <p className="mt-2 text-xs font-semibold text-[var(--muted-foreground)]">
      {note}
    </p>
  );
}

function PlayerVisibleNote({ note }: { note: string }) {
  if (!note) {
    return null;
  }

  return (
    <div className="mt-4 flex gap-2 rounded-lg bg-[var(--surface)] p-3 text-sm text-[var(--muted-foreground)]">
      <CircleDot className="mt-0.5 size-4 shrink-0 text-[var(--accent)]" aria-hidden="true" />
      <p className="min-h-10 overflow-hidden [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">{note}</p>
    </div>
  );
}

function PlayerCardFooter() {
  return (
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
  );
}

function isImportSourceNote(note: string) {
  return /^imported from\b/i.test(note.trim());
}
