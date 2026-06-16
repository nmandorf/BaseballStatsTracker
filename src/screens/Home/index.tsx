import { AppShell } from "@/components/AppShell";
import { HomeAuthEntry } from "@/components/HomeAuthEntry";

export function HomePage() {
  return (
    <AppShell activeNav="home">
      <HomeAuthEntry />
    </AppShell>
  );
}

export default HomePage;
