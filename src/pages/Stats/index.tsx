import { AppShell } from "@/components/AppShell";
import { SeasonStatsSection } from "@/sections/SeasonStatsSection";

export function StatsPage() {
  return (
    <AppShell activeNav="stats" requireAuth>
      <SeasonStatsSection />
    </AppShell>
  );
}

export default StatsPage;
