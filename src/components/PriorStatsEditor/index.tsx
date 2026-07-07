import { useMemo, useState } from "react";
import { Save } from "lucide-react";
import { addStats, derivePriorStats, getPriorStatsValidationError } from "@/lib/statCalculations";
import type { PlayerStats } from "@/types/stats";

type PriorStatsEditorProps = {
  playerName: string;
  stats: PlayerStats;
  currentGameStats: PlayerStats;
  onCancel: () => void;
  onSave: (stats: PlayerStats) => void;
};

const editableFields: Array<{ key: keyof PlayerStats; label: string }> = [
  { key: "gamesPlayed", label: "Games" },
  { key: "singles", label: "Singles" },
  { key: "doubles", label: "Doubles" },
  { key: "triples", label: "Triples" },
  { key: "homeRuns", label: "Home Runs" },
  { key: "walks", label: "Walks" },
  { key: "reachedOnError", label: "Reached on Error" },
  { key: "fieldersChoice", label: "Fielder's Choice" },
  { key: "sacFlies", label: "Sac Flies" },
  { key: "outs", label: "Total Outs" },
  { key: "runs", label: "Runs" },
  { key: "rbis", label: "RBI" },
];

export function PriorStatsEditor({ playerName, stats, currentGameStats, onCancel, onSave }: PriorStatsEditorProps) {
  const [draftStats, setDraftStats] = useState(stats);
  const derivedStats = useMemo(() => derivePriorStats(draftStats), [draftStats]);
  const seasonTotalStats = useMemo(
    () => addStats(derivedStats, currentGameStats),
    [currentGameStats, derivedStats],
  );
  const validationError = getPriorStatsValidationError(derivedStats);
  const classifiedOuts =
    derivedStats.groundouts +
    derivedStats.flyouts +
    derivedStats.lineouts +
    derivedStats.strikeoutsLooking +
    derivedStats.strikeoutsSwinging +
    derivedStats.otherOuts;

  function updateStat(key: keyof PlayerStats, value: string) {
    const nextValue = Math.max(0, Number.parseInt(value || "0", 10) || 0);

    setDraftStats((current) => ({
      ...current,
      [key]: nextValue,
    }));
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (validationError) {
      return;
    }

    onSave(derivedStats);
  }

  return (
    <form className="grid gap-4" onSubmit={submit}>
      <div>
        <p className="text-sm font-semibold text-[var(--muted-foreground)]">
          Update stats from before games tracked in this app. Current-game results are kept separate.
        </p>
        <p className="mt-1 text-sm font-bold text-foreground">{playerName}</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <DerivedStat label="Prior PA" value={derivedStats.plateAppearances} />
          <DerivedStat label="This Game PA" value={currentGameStats.plateAppearances} />
          <DerivedStat label="Season PA" value={seasonTotalStats.plateAppearances} />
        </div>
      </div>

      {classifiedOuts > 0 ? (
        <p className="rounded-lg bg-[var(--surface)] px-3 py-2 text-xs font-semibold text-[var(--muted-foreground)]">
          Keep at least {classifiedOuts} previously classified out{classifiedOuts === 1 ? "" : "s"}, plus any sac flies.
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {editableFields.map((field) => (
          <PriorStatField
            field={field}
            key={field.key}
            validationError={validationError}
            value={draftStats[field.key]}
            onUpdate={updateStat}
          />
        ))}
      </div>

      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
          Calculated automatically
        </p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          <DerivedStat label="Hits" value={derivedStats.hits} />
          <DerivedStat label="At-Bats" value={derivedStats.atBats} />
          <DerivedStat label="Plate Appearances" value={derivedStats.plateAppearances} />
        </div>
      </div>

      {validationError ? (
        <p className="rounded-lg bg-[var(--danger-soft)] px-3 py-2 text-sm font-bold text-[var(--danger)]" id="prior-stats-error" role="alert">
          {validationError}
        </p>
      ) : null}

      <div className="sticky -bottom-4 z-10 grid grid-cols-2 gap-2 border-t border-[var(--border)] bg-[var(--card)] py-3">
        <button
          className="btn-base btn-secondary min-h-12 px-3 text-sm"
          onClick={onCancel}
          type="button"
        >
          Cancel
        </button>
        <button
          className="btn-base btn-primary min-h-12 px-3 text-sm"
          disabled={Boolean(validationError)}
          type="submit"
        >
          <Save className="size-4" aria-hidden="true" />
          Save Stats
        </button>
      </div>
    </form>
  );
}

function PriorStatField({
  field,
  validationError,
  value,
  onUpdate,
}: {
  field: { key: keyof PlayerStats; label: string };
  validationError: string | null;
  value: number;
  onUpdate: (key: keyof PlayerStats, value: string) => void;
}) {
  const hasValidationError = Boolean(validationError && isPriorStatsValidationField(field.key));

  return (
    <label className="grid min-w-0 gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2 text-xs font-bold text-[var(--muted-foreground)]">
      <span className="flex min-h-8 items-center justify-center text-center leading-tight">{field.label}</span>
      <input
        aria-describedby={hasValidationError ? "prior-stats-error" : undefined}
        aria-invalid={hasValidationError ? true : undefined}
        className="min-h-11 w-full min-w-0 rounded-md border border-[var(--border)] bg-[var(--card)] px-2 text-center text-base font-bold tabular-nums text-foreground outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
        inputMode="numeric"
        min={0}
        onChange={(event) => onUpdate(field.key, event.target.value)}
        type="number"
        value={value}
      />
    </label>
  );
}

function isPriorStatsValidationField(key: keyof PlayerStats) {
  return key === "outs" || key === "sacFlies";
}

function DerivedStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-0 rounded-md bg-[var(--surface)] px-2 py-2 text-center">
      <p className="flex min-h-8 items-center justify-center text-center text-xs font-bold leading-tight text-[var(--muted-foreground)]">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  );
}
