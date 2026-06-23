import { AppShell } from "@/components/AppShell";
import { ScheduleSection } from "@/sections/ScheduleSection";

export function SchedulePage() {
  return (
    <AppShell activeNav="schedule" requireAuth>
      <ScheduleSection />
    </AppShell>
  );
}

export default SchedulePage;
