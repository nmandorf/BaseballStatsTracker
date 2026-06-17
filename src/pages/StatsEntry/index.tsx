import { AppShell } from "@/components/AppShell";
import { StatsEntrySection } from "@/sections/StatsEntrySection";

export function StatsEntryPage() {
  return (
    <AppShell activeNav={null} requireAuth>
      <StatsEntrySection />
    </AppShell>
  );
}

export default StatsEntryPage;
