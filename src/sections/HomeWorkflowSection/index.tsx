import {
  BarChart3,
  ClipboardList,
  ListOrdered,
  Settings2,
  UserRound,
} from "lucide-react";
import { InfoCard } from "@/components/InfoCard";
import { StatusPill } from "@/components/StatusPill";

const workflowItems = [
  {
    title: "Roster",
    description: "Permanent player list and player-card entry points.",
    icon: ClipboardList,
    label: "Plan 01",
  },
  {
    title: "Game setup",
    description: "Opponent, selected players, and pregame context.",
    icon: Settings2,
    label: "Plan 02",
  },
  {
    title: "Batting order",
    description: "Suggested order review once recommendation rules exist.",
    icon: ListOrdered,
    label: "Plan 03",
  },
  {
    title: "Stats entry",
    description:
      "Current batter card, result buttons, runners, RBI, summary, and save.",
    icon: BarChart3,
    label: "Plan 04",
  },
  {
    title: "Player profile",
    description: "Player trends and stat review after calculations are approved.",
    icon: UserRound,
    label: "Plan 05",
  },
];

export function HomeWorkflowSection() {
  return (
    <section id="workflow" className="bg-[var(--surface)] py-10 sm:py-14">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent)]">
              Planned workflow
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              The future app flow is visible, compact, and intentionally inactive.
            </h2>
            <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)] sm:text-base">
              The home page now feels like a product cockpit: touch-friendly,
              scannable, and direct. These cards do not launch roster, lineup,
              stats, or profile behavior yet.
            </p>
          </div>
          <StatusPill className="w-fit" tone="planned">
            Awaiting later OpenSpec changes
          </StatusPill>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {workflowItems.map((item, index) => (
            <InfoCard
              className="min-h-full"
              description={item.description}
              icon={item.icon}
              key={item.title}
              label={item.label}
              tone={index === 3 ? "accent" : "default"}
              title={item.title}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
