import { AppShell } from "@/components/AppShell";
import { GameSetupSection } from "@/sections/GameSetupSection";

export function GameSetupPage() {
  return (
    <AppShell activeNav={null} requireAuth>
      <GameSetupSection />
    </AppShell>
  );
}

export default GameSetupPage;
