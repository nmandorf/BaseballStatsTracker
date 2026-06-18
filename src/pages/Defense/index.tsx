import { AppShell } from "@/components/AppShell";
import { DefenseSection } from "@/sections/DefenseSection";

export function DefensePage() {
  return (
    <AppShell activeNav={null} requireAuth>
      <DefenseSection />
    </AppShell>
  );
}

export default DefensePage;
