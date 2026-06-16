import { AppShell } from "@/components/AppShell";
import { BattingOrderSection } from "@/sections/BattingOrderSection";

export function BattingOrderPage() {
  return (
    <AppShell activeNav="order" requireAuth>
      <BattingOrderSection />
    </AppShell>
  );
}

export default BattingOrderPage;
