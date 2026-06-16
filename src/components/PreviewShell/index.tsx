import { CircleDotDashed } from "lucide-react";
import { cn } from "@/lib/utils";

type PreviewShellProps = {
  title: string;
  subtitle: string;
  status?: string;
  children: React.ReactNode;
  className?: string;
};

export function PreviewShell({
  title,
  subtitle,
  status = "Static",
  children,
  className,
}: PreviewShellProps) {
  return (
    <article
      className={cn(
        "overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--card)] shadow-xl shadow-foreground/[0.06]",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--accent-strong)] px-4 py-3 text-white">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-white/12">
            <CircleDotDashed className="size-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold">{title}</h3>
            <p className="truncate text-xs font-medium text-white/62">
              {subtitle}
            </p>
          </div>
        </div>
        <span className="rounded-full border border-white/16 bg-white/12 px-2.5 py-1 text-xs font-bold">
          {status}
        </span>
      </div>
      <div className="p-3">{children}</div>
    </article>
  );
}
