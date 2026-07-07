"use client";

import { ArrowDown, ArrowUp, GripVertical } from "lucide-react";
import type { RecommendedLineupRow } from "@/lib/lineupRules";

type LineupPlayerRowProps = {
  index: number;
  isFirst: boolean;
  isLast: boolean;
  onMovePlayer: (index: number, direction: -1 | 1) => void;
  row: RecommendedLineupRow;
};

export function LineupPlayerRow({ index, isFirst, isLast, onMovePlayer, row }: LineupPlayerRowProps) {
  return (
    <div
      className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-lg bg-[var(--surface)] px-3 py-2.5"
    >
      <span className="flex size-9 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-bold text-white">
        {index + 1}
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-foreground">
          {row.player.name}
        </p>
        <p className="truncate text-xs text-[var(--muted-foreground)]">
          {row.role} - {row.player.gender}
        </p>
      </div>
      <div className="flex items-center gap-1">
        <span className="hidden rounded-full bg-[var(--card)] px-2.5 py-1 text-xs font-bold text-[var(--accent)] sm:inline-flex">
          {row.signal}
        </span>
        <button
          aria-label={`Move ${row.player.name} up`}
          className="btn-base btn-secondary size-9 min-h-0 p-0 text-[var(--accent)]"
          disabled={isFirst}
          onClick={() => onMovePlayer(index, -1)}
          type="button"
        >
          <ArrowUp className="size-4" aria-hidden="true" />
        </button>
        <button
          aria-label={`Move ${row.player.name} down`}
          className="btn-base btn-secondary size-9 min-h-0 p-0 text-[var(--accent)]"
          disabled={isLast}
          onClick={() => onMovePlayer(index, 1)}
          type="button"
        >
          <ArrowDown className="size-4" aria-hidden="true" />
        </button>
        <GripVertical className="size-4 text-[var(--muted-foreground)]" />
      </div>
    </div>
  );
}
