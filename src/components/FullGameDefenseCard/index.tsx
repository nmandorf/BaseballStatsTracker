import { Download } from "lucide-react";
import { FullGameDefenseTable } from "@/components/FullGameDefenseTable";
import type { FullGameDefensiveLineupPlan } from "@/lib/defensiveLineupPlanner";

type FullGameDefenseCardProps = {
  emptyReason: string;
  fullGameDefensePlan: FullGameDefensiveLineupPlan | null;
  onDownloadPdf: () => void;
};

export function FullGameDefenseCard({
  emptyReason,
  fullGameDefensePlan,
  onDownloadPdf,
}: FullGameDefenseCardProps) {
  return (
    <article className="order-5 min-w-0 rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm shadow-foreground/[0.035] lg:col-span-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
            Full-game defense
          </p>
          <h2 className="mt-1 text-lg font-semibold text-foreground">
            7-inning lineup grid
          </h2>
        </div>
        <button
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!fullGameDefensePlan}
          onClick={onDownloadPdf}
          type="button"
        >
          <Download className="size-4" aria-hidden="true" />
          PDF
        </button>
      </div>
      {fullGameDefensePlan?.warnings.map((warning) => (
        <p
          className="mt-3 rounded-lg bg-[var(--warning-soft)] px-3 py-2 text-sm font-bold text-[var(--warning)]"
          key={warning}
        >
          {warning}
        </p>
      ))}
      <div className="mt-4 overflow-x-auto rounded-lg border border-[var(--border)]">
        {fullGameDefensePlan ? (
          <FullGameDefenseTable fullGameDefensePlan={fullGameDefensePlan} />
        ) : (
          <p className="bg-[var(--surface)] p-4 text-sm font-bold text-[var(--muted-foreground)]">
            {emptyReason}
          </p>
        )}
      </div>
    </article>
  );
}
