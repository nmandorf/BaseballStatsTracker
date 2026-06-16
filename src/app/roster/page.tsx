import type { Metadata } from "next";
import { RosterPage } from "@/pages/Roster";

export const metadata: Metadata = {
  title: "Roster | Baseball Stat Tracker",
  description: "Static roster preview for Baseball Stat Tracker.",
};

export default function RosterRoute() {
  return <RosterPage />;
}
