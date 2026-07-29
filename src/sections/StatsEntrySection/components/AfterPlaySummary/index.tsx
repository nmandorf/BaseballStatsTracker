import { SummaryTile } from "@/components/SummaryTile";
import type { PlayPreviewDetails } from "@/sections/StatsEntrySection/liveEntryDecisions";

type AfterPlaySummaryProps = {
  lastSummary: string;
  playValidationError: string | null;
  previewDetails: PlayPreviewDetails;
  rbiCredit: boolean;
};

export function AfterPlaySummary({
  lastSummary,
  playValidationError,
  previewDetails,
  rbiCredit,
}: AfterPlaySummaryProps) {
  return (
    <article className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
        After-play summary
      </p>
      <p className="mt-2 text-sm font-semibold text-foreground">{previewDetails.summary}</p>
      {playValidationError ? (
        <p className="mt-2 rounded-md bg-[var(--danger-soft)] px-3 py-2 text-xs font-bold text-[var(--danger)]">
          {playValidationError}
        </p>
      ) : null}
      <div className="mt-3 grid grid-cols-3 gap-2">
        <SummaryTile label="Runs" value={`+${previewDetails.runs}`} />
        <SummaryTile label="Outs" value={previewDetails.outs} />
        <SummaryTile label="RBI" value={rbiCredit ? previewDetails.rbis : 0} />
      </div>
      <p className="mt-3 text-xs font-bold text-[var(--accent)]">
        Last saved: {lastSummary}
      </p>
    </article>
  );
}
