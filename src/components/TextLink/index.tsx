import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

type TextLinkProps = {
  href: string;
  children: React.ReactNode;
  intent?: "primary" | "secondary";
};

export function TextLink({
  href,
  children,
  intent = "secondary",
}: TextLinkProps) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex min-h-12 items-center justify-center gap-2 rounded-lg px-5 text-sm font-bold transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]",
        intent === "primary"
          ? "bg-[var(--accent)] text-white shadow-sm shadow-[var(--accent)]/20"
          : "border border-[var(--border)] bg-[var(--card)] text-foreground shadow-sm shadow-foreground/[0.025]",
      )}
    >
      {children}
      <ArrowRight className="size-4" aria-hidden="true" />
    </Link>
  );
}
