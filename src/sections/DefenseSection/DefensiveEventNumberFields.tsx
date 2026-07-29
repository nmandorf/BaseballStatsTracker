const numberClass =
  "min-h-11 w-full min-w-0 max-w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 text-sm font-bold tabular-nums text-foreground outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] sm:px-3";

export function DefensiveEventNumberFields({
  basesAllowed,
  outsRecorded,
  runsAllowed,
  onChangeBasesAllowed,
  onChangeOutsRecorded,
  onChangeRunsAllowed,
}: {
  basesAllowed: number;
  outsRecorded: number;
  runsAllowed: number;
  onChangeBasesAllowed: (nextBasesAllowed: number) => void;
  onChangeOutsRecorded: (nextOutsRecorded: number) => void;
  onChangeRunsAllowed: (nextRunsAllowed: number) => void;
}) {
  return (
    <div className="grid min-w-0 grid-cols-3 gap-2">
      <label className="grid min-w-0 gap-1 text-sm font-bold text-foreground">
        Outs
        <input
          className={numberClass}
          max={3}
          min={0}
          onChange={(event) =>
            onChangeOutsRecorded(Number(event.target.value))
          }
          type="number"
          value={outsRecorded}
        />
      </label>
      <label className="grid min-w-0 gap-1 text-sm font-bold text-foreground">
        Runs
        <input
          className={numberClass}
          min={0}
          onChange={(event) =>
            onChangeRunsAllowed(Number(event.target.value))
          }
          type="number"
          value={runsAllowed}
        />
      </label>
      <label className="grid min-w-0 gap-1 text-sm font-bold text-foreground">
        Extra
        <input
          className={numberClass}
          min={0}
          onChange={(event) =>
            onChangeBasesAllowed(Number(event.target.value))
          }
          type="number"
          value={basesAllowed}
        />
      </label>
    </div>
  );
}
