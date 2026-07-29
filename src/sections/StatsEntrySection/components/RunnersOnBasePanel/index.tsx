import { UserPlus } from "lucide-react";
import { StatusPill } from "@/components/StatusPill";
import {
  destinationLabel,
  destinationOptions,
  occupiedBaseEntries,
  type MovementSelections,
  type PinchRunnerSelections,
} from "@/lib/gameEngine";
import type { BaseLabel, UiRunnerDestination } from "@/types/runner";

type RunnersOnBasePanelProps = {
  effectiveMovements: MovementSelections;
  occupiedBases: ReturnType<typeof occupiedBaseEntries>;
  onChangeMovement: (base: BaseLabel, destination: UiRunnerDestination) => void;
  onRemovePinchRunner: (base: BaseLabel) => void;
  onSetPinchBase: (base: BaseLabel) => void;
  pinchRunners: PinchRunnerSelections;
};

export function RunnersOnBasePanel({
  effectiveMovements,
  occupiedBases,
  onChangeMovement,
  onRemovePinchRunner,
  onSetPinchBase,
  pinchRunners,
}: RunnersOnBasePanelProps) {
  return (
    <article className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
            Runners on base
          </p>
          <p className="mt-1 text-sm font-semibold text-foreground">
            {occupiedBases.length ? "Auto-filled movement" : "Bases empty"}
          </p>
        </div>
        <StatusPill tone="planned" className="min-h-7 rounded-md px-2 py-0.5">
          Edit before save
        </StatusPill>
      </div>

      <div className="mt-3 space-y-2">
        {occupiedBases.length ? (
          occupiedBases.map(([base, runner]) => (
            <RunnerMovementRow
              base={base}
              effectiveMovements={effectiveMovements}
              key={base}
              onChangeMovement={onChangeMovement}
              onRemovePinchRunner={onRemovePinchRunner}
              onSetPinchBase={onSetPinchBase}
              pinchRunner={pinchRunners[base]}
              runner={runner}
            />
          ))
        ) : (
          <div className="rounded-lg bg-[var(--surface)] p-4 text-sm font-semibold text-[var(--muted-foreground)]">
            Bases empty
          </div>
        )}
      </div>
    </article>
  );
}

function RunnerMovementRow({
  base,
  effectiveMovements,
  onChangeMovement,
  onRemovePinchRunner,
  onSetPinchBase,
  pinchRunner,
  runner,
}: {
  base: BaseLabel;
  effectiveMovements: MovementSelections;
  onChangeMovement: (base: BaseLabel, destination: UiRunnerDestination) => void;
  onRemovePinchRunner: (base: BaseLabel) => void;
  onSetPinchBase: (base: BaseLabel) => void;
  pinchRunner: PinchRunnerSelections[BaseLabel] | undefined;
  runner: ReturnType<typeof occupiedBaseEntries>[number][1];
}) {
  const displayedRunner = pinchRunner ?? runner;

  return (
    <div className="rounded-lg bg-[var(--surface)] p-3">
      <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-start">
        <div>
          <p className="text-sm font-semibold text-foreground">
            {base}: {displayedRunner.name}
          </p>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            {pinchRunner ? `Pinch running for ${runner.name}` : "Original runner"}
          </p>
        </div>
        <RunnerDestinationSelect
          base={base}
          effectiveMovements={effectiveMovements}
          onChangeMovement={onChangeMovement}
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          className="btn-base btn-secondary min-h-9 px-3 text-xs text-[var(--accent)]"
          onClick={() => onSetPinchBase(base)}
          type="button"
        >
          <UserPlus className="size-4" aria-hidden="true" />
          {pinchRunner ? "Change" : "Use Pinch Runner"}
        </button>
        {pinchRunner ? (
          <button
            className="btn-base btn-danger-secondary min-h-9 px-3 text-xs"
            onClick={() => onRemovePinchRunner(base)}
            type="button"
          >
            Remove Pinch Runner
          </button>
        ) : null}
      </div>
    </div>
  );
}

function RunnerDestinationSelect({
  base,
  effectiveMovements,
  onChangeMovement,
}: {
  base: BaseLabel;
  effectiveMovements: MovementSelections;
  onChangeMovement: (base: BaseLabel, destination: UiRunnerDestination) => void;
}) {
  return (
    <select
      className="min-h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 text-sm font-bold text-foreground outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] sm:w-40"
      onChange={(event) => onChangeMovement(base, event.target.value as UiRunnerDestination)}
      value={effectiveMovements[base] ?? base}
    >
      {destinationOptions[base].map((destination) => (
        <option key={destination} value={destination}>
          {destinationLabel[destination]}
        </option>
      ))}
    </select>
  );
}
