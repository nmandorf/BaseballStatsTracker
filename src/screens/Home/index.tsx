import { AppShell } from "@/components/AppShell";
import { getQuickScoresSchedule } from "@/lib/quickscoresSchedule";
import { HomeHeroSection } from "@/sections/HomeHeroSection";

export async function HomePage() {
  const schedule = await getQuickScoresSchedule();

  return (
    <AppShell activeNav="home">
      <HomeHeroSection schedule={schedule} />
    </AppShell>
  );
}

export default HomePage;
