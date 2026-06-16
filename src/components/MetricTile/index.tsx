import { cn } from "@/lib/utils";

type MetricTileProps = {
  label: string;
  value: string;
  helper?: string;
  tone?: "default" | "accent" | "success" | "warning";
  className?: string;
};

export function MetricTile({
  label,
  value,
  helper,
  tone = "default",
  className,
}: MetricTileProps) {
  const toneClassName = {
    default: "bg-[var(--surface)] text-foreground",
    accent: "bg-[var(--accent-soft)] text-[var(--accent-strong)]",
    success: "bg-[var(--success-soft)] text-[var(--success)]",
    warning: "bg-[var(--warning-soft)] text-[var(--warning)]",
  };

  return (
    <div className={cn("rounded-lg px-3 py-3", toneClassName[tone], className)}>
      <p className="text-xs font-bold uppercase tracking-[0.12em] opacity-70">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
      {helper ? <p className="mt-1 text-xs font-semibold opacity-70">{helper}</p> : null}
    </div>
  );
}
