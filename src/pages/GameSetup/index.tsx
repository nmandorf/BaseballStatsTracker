import { AppShell } from "@/components/AppShell";
import { GameSetupSection } from "@/sections/GameSetupSection";

export function GameSetupPage() {
  return (
    <AppShell activeNav="game" requireAuth>
      <GameSetupSection />
    </AppShell>
  );
}

export default GameSetupPage;
