"use client";

import { ScheduleEditor } from "@/components/ScheduleEditor";
import { TeamSetupGate } from "@/components/TeamSetupGate";
import { useActiveTeam } from "@/lib/teamStorage";

export function ScheduleSection() {
  const team = useActiveTeam();
  if (!team) return <TeamSetupGate title="Create your team before managing its schedule." />;
  return <section className="bg-background py-6 sm:py-8"><div className="mx-auto w-full max-w-4xl px-4 sm:px-6 lg:px-8"><h1 className="text-2xl font-black text-foreground">Team schedule</h1><p className="mt-1 text-sm font-semibold text-[var(--muted-foreground)]">Add games, bye weeks, and changes for {team.name}.</p><div className="mt-4"><ScheduleEditor teamId={team.id} /></div></div></section>;
}
