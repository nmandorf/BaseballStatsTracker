import type { Metadata } from "next";
import { StatsEntryPage } from "@/pages/StatsEntry";

export const metadata: Metadata = {
  title: "Stats Entry | Baseball Stat Tracker",
  description: "Static stats entry preview for Baseball Stat Tracker.",
};

export default function StatsEntryRoute() {
  return <StatsEntryPage />;
}
