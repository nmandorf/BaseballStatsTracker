import { cn } from "@/lib/utils";

type ResultButtonProps = {
  label: string;
  selected?: boolean;
  muted?: boolean;
  disabled?: boolean;
  lockReason?: string;
  onClick?: () => void;
};

export function ResultButton({
  label,
  selected = false,
  muted = false,
  disabled = false,
  lockReason,
  onClick,
}: ResultButtonProps) {
  return (
    <button
      type="button"
      aria-label={lockReason ? `${label} locked: ${lockReason}` : label}
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
      title={lockReason}
      className={cn(
        "btn-base min-h-12 px-2 text-base font-black tabular-nums disabled:border-[var(--border)] disabled:bg-[var(--surface)] disabled:text-[var(--muted-foreground)]",
        selected
          ? "btn-choice-selected"
          : "btn-secondary active:bg-[var(--accent-soft)]",
        muted ? "opacity-70" : "",
      )}
    >
      {label}
    </button>
  );
}
