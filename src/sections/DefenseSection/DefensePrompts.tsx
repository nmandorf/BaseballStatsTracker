import Link from "next/link";

export function PregameDefensePrompt() {
  return (
    <DefensePrompt
      href="/batting-order"
      linkLabel="Open Batting Order"
      message="Approve a batting order before setting game defense."
    />
  );
}

export function FinalDefensePrompt() {
  return (
    <DefensePrompt
      href="/stats"
      linkLabel="Open Stats"
      message="This game is final."
    />
  );
}

function DefensePrompt({
  href,
  linkLabel,
  message,
}: {
  href: string;
  linkLabel: string;
  message: string;
}) {
  return (
    <section className="bg-background py-6 sm:py-8">
      <div className="mx-auto w-full max-w-3xl px-4 sm:px-6">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
          <p className="text-sm font-bold text-foreground">{message}</p>
          <Link
            className="btn-base btn-primary mt-3 min-h-11 px-4 text-sm"
            href={href}
          >
            {linkLabel}
          </Link>
        </div>
      </div>
    </section>
  );
}
