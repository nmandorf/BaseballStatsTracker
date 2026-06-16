import type { LucideIcon } from "lucide-react";
import { StatusPill } from "@/components/StatusPill";

type ScreenHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  status?: string;
};

export function ScreenHeader({
  eyebrow,
  title,
  description,
  icon: Icon,
  status = "Static preview",
}: ScreenHeaderProps) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm shadow-foreground/[0.035] sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent)]">
            {eyebrow}
          </p>
          <h1 className="mt-2 break-words text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {title}
          </h1>
        </div>
        <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]">
          <Icon className="size-5" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted-foreground)] sm:text-base">
        {description}
      </p>
      <div className="mt-4">
        <StatusPill tone="hold">{status}</StatusPill>
      </div>
    </div>
  );
}
