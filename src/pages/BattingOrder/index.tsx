import { AppShell } from "@/components/AppShell";
import { BattingOrderSection } from "@/sections/BattingOrderSection";

export function BattingOrderPage() {
  return (
    <AppShell activeNav={null} requireAuth>
      <BattingOrderSection />
    </AppShell>
  );
}

export default BattingOrderPage;
