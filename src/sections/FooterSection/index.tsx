export function FooterSection() {
  return (
    <footer className="border-t border-[var(--border)] bg-[var(--surface)]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-6 text-sm font-medium text-[var(--muted-foreground)] sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p>Baseball Stat Tracker</p>
        <p className="font-semibold text-[var(--accent)]">
          QuickScores schedule sync
        </p>
      </div>
    </footer>
  );
}
