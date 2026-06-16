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
      disabled={disabled}
      onClick={onClick}
      title={lockReason}
      className={cn(
        "flex min-h-12 items-center justify-center rounded-lg border px-2 text-base font-black tabular-nums transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:cursor-not-allowed disabled:border-[var(--border)] disabled:bg-[var(--surface)] disabled:text-[var(--muted-foreground)] disabled:opacity-45",
        selected
          ? "border-[var(--accent)] bg-[var(--accent)] text-white"
          : "border-[var(--border)] bg-[var(--card)] text-foreground active:bg-[var(--accent-soft)]",
        muted ? "opacity-70" : "",
      )}
    >
      {label}
    </button>
  );
}
