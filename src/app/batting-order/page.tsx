import type { Metadata } from "next";
import { BattingOrderPage } from "@/pages/BattingOrder";

export const metadata: Metadata = {
  title: "Batting Order | Baseball Stat Tracker",
  description: "Static batting order preview for Baseball Stat Tracker.",
};

export default function BattingOrderRoute() {
  return <BattingOrderPage />;
}
