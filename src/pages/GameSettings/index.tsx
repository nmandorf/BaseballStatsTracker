import { AppShell } from "@/components/AppShell";
import { GameSettingsSection } from "@/sections/GameSettingsSection";

export function GameSettingsPage() {
  return (
    <AppShell activeNav="settings" requireAuth>
      <GameSettingsSection />
    </AppShell>
  );
}

export default GameSettingsPage;
