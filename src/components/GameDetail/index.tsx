"use client";

import type { LucideIcon } from "lucide-react";

type GameDetailProps = {
  icon: LucideIcon;
  label: string;
  value: string;
};

export function GameDetail({ icon: Icon, label, value }: GameDetailProps) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3">
      <Icon className="size-4 text-[var(--accent)]" />
      <p className="mt-2 text-xs font-bold text-[var(--muted-foreground)]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}
