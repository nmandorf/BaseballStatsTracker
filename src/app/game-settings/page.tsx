import type { Metadata } from "next";
import { GameSettingsPage } from "@/pages/GameSettings";

export const metadata: Metadata = {
  title: "Game Settings | Baseball Stat Tracker",
  description: "Game rule settings for Baseball Stat Tracker.",
};

export default function GameSettingsRoute() {
  return <GameSettingsPage />;
}
