import type { Metadata } from "next";
import { StatsPage } from "@/pages/Stats";

export const metadata: Metadata = {
  title: "Season Stats | Baseball Stat Tracker",
  description: "Season stats and completed game history for Baseball Stat Tracker.",
};

export default function StatsRoute() {
  return <StatsPage />;
}
