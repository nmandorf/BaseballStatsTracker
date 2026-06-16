import type { Metadata } from "next";
import { Suspense } from "react";
import { AppShell } from "@/components/AppShell";
import { FirebaseLogin } from "@/components/FirebaseLogin";

export const metadata: Metadata = {
  title: "Sign In | Baseball Stat Tracker",
  description: "Sign in with Google to access your team stats.",
};

export default function LoginRoute() {
  return (
    <AppShell activeNav="home">
      <Suspense
        fallback={
          <section className="bg-background py-8 sm:py-12">
            <div className="mx-auto w-full max-w-6xl px-4 text-sm font-semibold text-[var(--muted-foreground)] sm:px-6 lg:px-8">
              Loading team login...
            </div>
          </section>
        }
      >
        <FirebaseLogin />
      </Suspense>
    </AppShell>
  );
}
