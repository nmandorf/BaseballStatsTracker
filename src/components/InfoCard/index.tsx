import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type InfoCardProps = {
  title: string;
  description: string;
  icon: LucideIcon;
  label?: string;
  className?: string;
  tone?: "default" | "accent" | "success" | "warning";
};

export function InfoCard({
  title,
  description,
  icon: Icon,
  label,
  className,
  tone = "default",
}: InfoCardProps) {
  const toneClassName = {
    default: "bg-[var(--surface)] text-[var(--accent)]",
    accent: "bg-[var(--accent)] text-white",
    success: "bg-[var(--success-soft)] text-[var(--success)]",
    warning: "bg-[var(--warning-soft)] text-[var(--warning)]",
  };

  return (
    <article
      className={cn(
        "rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm shadow-foreground/[0.035]",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-md", toneClassName[tone])}>
          <Icon className="size-5" aria-hidden="true" />
        </span>
        {label ? (
          <p className="rounded-full bg-[var(--surface)] px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
            {label}
          </p>
        ) : null}
      </div>
      <h3 className="mt-4 text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
        {description}
      </p>
    </article>
  );
}
