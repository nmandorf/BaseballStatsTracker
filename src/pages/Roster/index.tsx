import { AppShell } from "@/components/AppShell";
import { RosterSection } from "@/sections/RosterSection";

export function RosterPage() {
  return (
    <AppShell activeNav="roster" requireAuth>
      <RosterSection />
    </AppShell>
  );
}

export default RosterPage;
