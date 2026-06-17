import type { ReactNode } from "react";
import { AuthGate } from "@/components/AuthGate";
import { FooterSection } from "@/sections/FooterSection";
import { HeaderSection, type AppNavKey } from "@/sections/HeaderSection";

type AppShellProps = {
  activeNav: AppNavKey | null;
  children: ReactNode;
  requireAuth?: boolean;
};

export function AppShell({ activeNav, children, requireAuth = false }: AppShellProps) {
  return (
    <>
      <HeaderSection activeNav={activeNav} />
      <main className="flex-1">
        {requireAuth ? <AuthGate>{children}</AuthGate> : children}
      </main>
      <FooterSection />
    </>
  );
}
