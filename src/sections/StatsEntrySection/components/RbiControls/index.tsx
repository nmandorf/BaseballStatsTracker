import { cn } from "@/lib/utils";

type RbiControlsProps = {
  batterName: string;
  hasRuns: boolean;
  onSetRbiCredit: (credit: boolean) => void;
  previewRuns: number;
  rbiCredit: boolean;
};

export function RbiControls({
  batterName,
  hasRuns,
  onSetRbiCredit,
  previewRuns,
  rbiCredit,
}: RbiControlsProps) {
  if (!hasRuns) {
    return null;
  }

  return (
    <article className="rounded-lg border border-[var(--accent)]/20 bg-[var(--accent-soft)] p-3">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--accent)]">
        RBI controls
      </p>
      <div className="mt-2 grid gap-3 sm:grid-cols-[1fr_12rem] sm:items-center">
        <p className="text-sm font-semibold text-[var(--accent-strong)]">
          {previewRuns} run{previewRuns === 1 ? "" : "s"} scored. Credit RBI to {getFirstName(batterName)}?
        </p>
        <div className="grid grid-cols-2 gap-2 text-center text-sm font-bold">
          <RbiChoiceButton label="Yes" onClick={() => onSetRbiCredit(true)} selected={rbiCredit} />
          <RbiChoiceButton label="No" onClick={() => onSetRbiCredit(false)} selected={!rbiCredit} />
        </div>
      </div>
    </article>
  );
}

function RbiChoiceButton({
  label,
  onClick,
  selected,
}: {
  label: string;
  onClick: () => void;
  selected: boolean;
}) {
  return (
    <button
      className={cn("btn-base min-h-11 px-3", selected ? "btn-choice-selected" : "btn-secondary")}
      aria-pressed={selected}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function getFirstName(name: string) {
  return name.split(" ")[0];
}
