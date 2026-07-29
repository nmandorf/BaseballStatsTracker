"use client";

import { StatusPill } from "@/components/StatusPill";
import { defensiveEventLabels } from "@/lib/defenseEngine";
import { cn } from "@/lib/utils";
import type { DefensiveEventType } from "@/types/defense";
import type { Player } from "@/types/player";
import type {
  DefensiveEventFormHandlers,
  DefensiveEventFormState,
} from "./useDefensiveEventForm";
import { DefensiveEventFields } from "./DefensiveEventFields";

const eventTypes: DefensiveEventType[] = [
  "ROUTINE_OUT",
  "HIT_NO_PLAY",
  "MISPLAY",
  "GREAT_PLAY",
  "EXTRA_BASES_ALLOWED",
  "DOUBLE_PLAY",
];

export function DefensiveEventCard({
  effectiveFielderId,
  fielderOptions,
  handlers,
  isFielding,
  previewSummary,
  state,
}: {
  effectiveFielderId: string;
  fielderOptions: Player[];
  handlers: DefensiveEventFormHandlers;
  isFielding: boolean;
  previewSummary: string;
  state: DefensiveEventFormState;
}) {
  const { changeEventType, setNotes } = handlers;
  const { eventType, notes } = state;

  return (
    <article className="min-w-0 rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm shadow-foreground/[0.035]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
            Event
          </p>
          <h2 className="mt-1 text-lg font-semibold text-foreground">
            {defensiveEventLabels[eventType]}
          </h2>
        </div>
        <StatusPill tone={isFielding ? "ready" : "review"}>
          {isFielding ? "Live" : "Queued"}
        </StatusPill>
      </div>

      <DefensiveEventTypePicker
        eventType={eventType}
        onChange={changeEventType}
      />

      <div className="mt-4 grid min-w-0 gap-3">
        <DefensiveEventFields
          effectiveFielderId={effectiveFielderId}
          fielderOptions={fielderOptions}
          handlers={handlers}
          state={state}
        />

        <label className="grid min-w-0 gap-1 text-sm font-bold text-foreground">
          Notes
          <textarea
            className="min-h-24 w-full min-w-0 max-w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm font-semibold text-foreground outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
            onChange={(event) => setNotes(event.target.value)}
            value={notes}
          />
        </label>

        <div className="rounded-lg bg-[var(--surface)] p-3 text-sm font-semibold text-[var(--muted-foreground)]">
          {previewSummary}
        </div>
      </div>
    </article>
  );
}

function DefensiveEventTypePicker({
  eventType,
  onChange,
}: {
  eventType: DefensiveEventType;
  onChange: (nextType: DefensiveEventType) => void;
}) {
  return (
    <div className="mt-4 grid min-w-0 grid-cols-2 gap-2">
      {eventTypes.map((type) => (
        <button
          className={cn(
            "btn-base min-h-11 px-3 text-sm",
            eventType === type ? "btn-choice-selected" : "btn-choice",
          )}
          aria-pressed={eventType === type}
          key={type}
          onClick={() => onChange(type)}
          type="button"
        >
          {defensiveEventLabels[type]}
        </button>
      ))}
    </div>
  );
}
