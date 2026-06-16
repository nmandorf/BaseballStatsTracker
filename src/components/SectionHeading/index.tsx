import { cn } from "@/lib/utils";

type SectionHeadingProps = {
  eyebrow: string;
  title: string;
  description: string;
  align?: "left" | "between";
  aside?: React.ReactNode;
  className?: string;
};

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  aside,
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4",
        align === "between" ? "sm:flex-row sm:items-end sm:justify-between" : "",
        className,
      )}
    >
      <div className="max-w-2xl">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent)]">
          {eyebrow}
        </p>
        <h2 className="mt-2 text-2xl font-semibold leading-tight text-foreground sm:text-3xl">
          {title}
        </h2>
        <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)] sm:text-base">
          {description}
        </p>
      </div>
      {aside ? <div className="shrink-0">{aside}</div> : null}
    </div>
  );
}
