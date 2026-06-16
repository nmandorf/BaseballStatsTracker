import { cn } from "@/lib/utils";

type StatusPillProps = {
  children: React.ReactNode;
  tone?: "ready" | "planned" | "hold" | "stitch" | "danger" | "review" | "done";
  className?: string;
};

const toneClassName = {
  ready: "border-[var(--success)]/25 bg-[var(--success-soft)] text-[var(--success)]",
  planned: "border-[var(--accent)]/25 bg-[var(--accent-soft)] text-[var(--accent)]",
  hold: "border-[var(--warning)]/25 bg-[var(--warning-soft)] text-[var(--warning)]",
  stitch: "border-[var(--border)] bg-[var(--card)] text-[var(--accent-strong)]",
  danger: "border-[var(--danger)]/25 bg-[var(--danger-soft)] text-[var(--danger)]",
  review: "border-[var(--warning)]/30 bg-[var(--warning-soft)] text-[var(--warning)]",
  done: "border-[var(--success)]/30 bg-[var(--success-soft)] text-[var(--success)]",
};

export function StatusPill({
  children,
  tone = "hold",
  className,
}: StatusPillProps) {
  return (
    <span
      className={cn(
        "inline-flex min-h-8 max-w-full items-center rounded-full border px-3 py-1 text-center text-xs font-bold leading-tight shadow-sm shadow-foreground/[0.025]",
        toneClassName[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
