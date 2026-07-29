"use client";

import { TeamSetupGate } from "@/components/TeamSetupGate";
import { savePregameSetup, usePregameSetup } from "@/lib/pregameSetupStorage";
import { useActiveTeam } from "@/lib/teamStorage";
import type { GameRules } from "@/types/game";
import {
  RuleTogglesCard,
  ScoringLimitsCard,
  type BooleanRule,
} from "./GameSettingsCards";

export function GameSettingsSection() {
  const activeTeam = useActiveTeam();
  const setup = usePregameSetup();
  const rules = setup.gameRules;

  if (!activeTeam) {
    return <TeamSetupGate title="Create your team before changing game settings." />;
  }

  function saveRules(nextRules: GameRules) {
    savePregameSetup({
      ...setup,
      gameRules: nextRules,
    });
  }

  function updateBooleanRule(key: BooleanRule["key"], enabled: boolean) {
    saveRules({
      ...rules,
      [key]: enabled,
    });
  }

  function updatePositiveNumber(key: "homeRunLimit" | "runLimitPerInning", value: string) {
    const numericValue = Number(value);

    if (!Number.isInteger(numericValue) || numericValue < 1) {
      return;
    }

    saveRules({
      ...rules,
      [key]: numericValue,
    });
  }

  return (
    <section className="bg-background py-6 sm:py-8">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <h1 className="sr-only">Game settings for {activeTeam.name}</h1>
        <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
          <ScoringLimitsCard rules={rules} onSaveRules={saveRules} onUpdatePositiveNumber={updatePositiveNumber} />
          <RuleTogglesCard rules={rules} onUpdateBooleanRule={updateBooleanRule} />
        </div>
      </div>
    </section>
  );
}
