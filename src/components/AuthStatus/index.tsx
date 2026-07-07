"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogIn, LogOut, UserRound } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";

export function AuthStatus() {
  const router = useRouter();
  const { isConfigured, isLoading, signOut, user } = useAuth();

  async function signOutAndReturnHome() {
    await signOut();
    router.replace("/");
  }

  if (isLoading) {
    return <AuthStatusLoading />;
  }

  if (!isConfigured || !user) {
    return <AuthStatusSignInLink />;
  }

  return <SignedInAuthStatus label={getSignedInLabel(user)} onSignOut={signOutAndReturnHome} />;
}

function AuthStatusLoading() {
  return (
    <span className="hidden min-h-10 items-center rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 text-xs font-bold text-[var(--muted-foreground)] shadow-sm shadow-foreground/[0.025] sm:inline-flex">
      Checking sign-in
    </span>
  );
}

function AuthStatusSignInLink() {
  return (
    <Link className="btn-base btn-primary min-h-10 px-3 text-xs" href="/login">
      <LogIn className="size-4" aria-hidden="true" />
      Sign in
    </Link>
  );
}

function SignedInAuthStatus({
  label,
  onSignOut,
}: {
  label: string;
  onSignOut: () => Promise<void>;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="hidden h-10 w-28 items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 text-xs font-bold text-foreground shadow-sm shadow-foreground/[0.025] lg:inline-flex">
        <UserRound className="size-4 shrink-0 text-[var(--accent)]" aria-hidden="true" />
        <span className="truncate">{label}</span>
      </span>
      <button
        className="btn-base btn-secondary h-10 w-28 min-h-0 shrink-0 whitespace-nowrap px-3 text-xs text-[var(--muted-foreground)]"
        onClick={() => void onSignOut()}
        type="button"
      >
        <LogOut className="size-4" aria-hidden="true" />
        <span>Sign out</span>
      </button>
    </div>
  );
}

function getSignedInLabel(user: NonNullable<ReturnType<typeof useAuth>["user"]>) {
  return user.displayName || user.email || "Signed in";
}
