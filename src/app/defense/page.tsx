import type { Metadata } from "next";
import { DefensePage } from "@/pages/Defense";

export const metadata: Metadata = {
  title: "Defense | Baseball Stat Tracker",
  description: "Track defensive alignment and fielding events.",
};

export default function DefenseRoute() {
  return <DefensePage />;
}
