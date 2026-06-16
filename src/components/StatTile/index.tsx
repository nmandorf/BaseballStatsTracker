import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type StatTileProps = {
  label: string;
  value: string;
  helper?: string;
  icon?: LucideIcon;
  tone?: "default" | "accent" | "success" | "warning" | "danger";
};

const toneClassName = {
  default: "bg-[var(--surface)] text-[var(--accent)]",
  accent: "bg-[var(--accent)] text-white",
  success: "bg-[var(--success-soft)] text-[var(--success)]",
  warning: "bg-[var(--warning-soft)] text-[var(--warning)]",
  danger: "bg-[var(--danger-soft)] text-[var(--danger)]",
};

export function StatTile({
  label,
  value,
  helper,
  icon: Icon,
  tone = "default",
}: StatTileProps) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3 shadow-sm shadow-foreground/[0.025]">
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
          {label}
        </p>
        {Icon ? (
          <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-md", toneClassName[tone])}>
            <Icon className="size-4" aria-hidden="true" />
          </span>
        ) : null}
      </div>
      <p className="mt-2 break-words text-2xl font-semibold tracking-tight text-foreground">
        {value}
      </p>
      {helper ? (
        <p className="mt-1 break-words text-xs font-medium text-[var(--muted-foreground)]">
          {helper}
        </p>
      ) : null}
    </div>
  );
}
