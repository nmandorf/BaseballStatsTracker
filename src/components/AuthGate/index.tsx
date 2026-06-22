"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { getMissingFirebaseConfig } from "@/lib/firebase";
import { hydrateFirstGameStateFromPrisma } from "@/lib/firstGameStorage";
import { hydrateActiveTeamFromBackend } from "@/lib/teamStorage";

type AuthGateProps = {
  children: React.ReactNode;
};

export function AuthGate({ children }: AuthGateProps) {
  const { isConfigured, isLoading, user } = useAuth();
  const pathname = usePathname();
  const loginHref = `/login?next=${encodeURIComponent(pathname ?? "/")}`;

  useEffect(() => {
    if (!user) {
      return;
    }

    void hydrateActiveTeamFromBackend().then(() => {
      hydrateFirstGameStateFromPrisma({ force: true });
    });
  }, [user]);

  if (isLoading) {
    return (
      <section className="bg-background py-10">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-5 text-sm font-semibold text-[var(--muted-foreground)] shadow-sm shadow-foreground/[0.035]">
            Checking team sign-in...
          </div>
        </div>
      </section>
    );
  }

  if (!isConfigured) {
    const missingConfig = getMissingFirebaseConfig();

    return (
      <section className="bg-background py-10">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-lg border border-[var(--warning)]/25 bg-[var(--warning-soft)] p-5 shadow-sm shadow-foreground/[0.035]">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 size-5 shrink-0 text-[var(--warning)]" aria-hidden="true" />
              <div className="grid gap-2">
                <h1 className="text-lg font-bold text-foreground">
                  Firebase sign-in needs configuration.
                </h1>
                <p className="text-sm font-medium text-[var(--muted-foreground)]">
                  Add the missing Firebase web app values to your local environment before opening team stats.
                </p>
                <p className="break-words text-xs font-bold text-[var(--warning)]">
                  Missing: {missingConfig.join(", ")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="bg-background py-10">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm shadow-foreground/[0.035]">
            <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
              <div className="grid gap-2">
                <p className="text-xs font-bold uppercase tracking-normal text-[var(--accent)]">
                  Team stats locked
                </p>
                <h1 className="text-2xl font-black text-foreground">
                  Sign in to open your team&apos;s stats.
                </h1>
                <p className="text-sm font-medium text-[var(--muted-foreground)]">
                  Use your Google account to manage roster, game setup, batting order, and live stat entry.
                </p>
              </div>
              <Link
                className="inline-flex min-h-12 items-center justify-center rounded-lg bg-[var(--accent)] px-4 text-sm font-bold text-white shadow-sm shadow-[var(--accent)]/20"
                href={loginHref}
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return children;
}
