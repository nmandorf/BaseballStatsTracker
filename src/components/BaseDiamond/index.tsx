import { CircleDot } from "lucide-react";
import { cn } from "@/lib/utils";

type BaseDiamondProps = {
  first?: string;
  second?: string;
  third?: string;
  homeNote?: string;
};

function BaseMarker({
  label,
  runner,
  className,
}: {
  label: string;
  runner?: string;
  className: string;
}) {
  return (
    <div className={cn("absolute flex flex-col items-center gap-1 text-center", className)}>
      <span
        className={cn(
          "flex size-11 rotate-45 items-center justify-center rounded-sm border text-xs font-black",
          runner
            ? "border-[var(--accent)] bg-[var(--accent)] text-white"
            : "border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)]",
        )}
      >
        <span className="-rotate-45">{label}</span>
      </span>
      <span className="max-w-24 text-xs font-bold leading-tight text-foreground">
        {runner ?? "Empty"}
      </span>
    </div>
  );
}

export function BaseDiamond({
  first,
  second,
  third,
  homeNote = "Home",
}: BaseDiamondProps) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
      <div className="relative mx-auto aspect-square w-full max-w-56">
        <div className="absolute inset-[21%] rotate-45 rounded-lg border border-dashed border-[var(--border)] bg-[var(--card)]/60" />
        <BaseMarker className="left-1/2 top-0 -translate-x-1/2" label="2B" runner={second} />
        <BaseMarker className="right-0 top-1/2 -translate-y-1/2" label="1B" runner={first} />
        <BaseMarker className="left-0 top-1/2 -translate-y-1/2" label="3B" runner={third} />
        <div className="absolute bottom-0 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1 text-center">
          <span className="flex size-11 rotate-45 items-center justify-center rounded-sm border border-[var(--accent-soft)] bg-[var(--accent-soft)] text-xs font-black text-[var(--accent)]">
            <span className="-rotate-45">H</span>
          </span>
          <span className="inline-flex items-center gap-1 text-xs font-bold text-[var(--accent)]">
            <CircleDot className="size-3" aria-hidden="true" />
            {homeNote}
          </span>
        </div>
      </div>
    </div>
  );
}
