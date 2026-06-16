import { AppShell } from "@/components/AppShell";
import { StatsEntrySection } from "@/sections/StatsEntrySection";

export function StatsEntryPage() {
  return (
    <AppShell activeNav="stats" requireAuth>
      <StatsEntrySection />
    </AppShell>
  );
}

export default StatsEntryPage;
