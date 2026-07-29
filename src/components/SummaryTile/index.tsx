type SummaryTileProps = {
  label: string;
  value: number | string;
};

export function SummaryTile({ label, value }: SummaryTileProps) {
  return (
    <div className="rounded-lg bg-[var(--surface)] px-3 py-2">
      <p className="text-xs font-bold text-[var(--muted-foreground)]">{label}</p>
      <p className="mt-1 text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}
