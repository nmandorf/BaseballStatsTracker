"use client";

import Link from "next/link";
import { LogIn, LogOut, UserRound } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";

export function AuthStatus() {
  const { isConfigured, isLoading, signOut, user } = useAuth();

  if (isLoading) {
    return (
      <span className="hidden min-h-10 items-center rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 text-xs font-bold text-[var(--muted-foreground)] shadow-sm shadow-foreground/[0.025] sm:inline-flex">
        Checking sign-in
      </span>
    );
  }

  if (!isConfigured || !user) {
    return (
      <Link
        className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[var(--accent)] bg-[var(--accent)] px-3 text-xs font-bold text-white shadow-sm shadow-[var(--accent)]/20"
        href="/login"
      >
        <LogIn className="size-4" aria-hidden="true" />
        Sign in
      </Link>
    );
  }

  const label = user.displayName || user.email || "Signed in";

  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="hidden max-w-44 items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-xs font-bold text-foreground shadow-sm shadow-foreground/[0.025] lg:inline-flex">
        <UserRound className="size-4 shrink-0 text-[var(--accent)]" aria-hidden="true" />
        <span className="truncate">{label}</span>
      </span>
      <button
        className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 text-xs font-bold text-[var(--muted-foreground)] shadow-sm shadow-foreground/[0.025] hover:bg-[var(--surface)] hover:text-foreground"
        onClick={() => void signOut()}
        type="button"
      >
        <LogOut className="size-4" aria-hidden="true" />
        <span className="hidden sm:inline">Sign out</span>
      </button>
    </div>
  );
}
