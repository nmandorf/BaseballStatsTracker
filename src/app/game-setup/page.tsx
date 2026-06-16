import type { Metadata } from "next";
import { GameSetupPage } from "@/pages/GameSetup";

export const metadata: Metadata = {
  title: "Game Setup | Baseball Stat Tracker",
  description: "Static game setup preview for Baseball Stat Tracker.",
};

export default function GameSetupRoute() {
  return <GameSetupPage />;
}
