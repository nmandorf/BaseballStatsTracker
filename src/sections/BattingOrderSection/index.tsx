"use client";

import { TeamSetupGate } from "@/components/TeamSetupGate";
import { BattingOrderView } from "./BattingOrderView";
import { useBattingOrderActions } from "./useBattingOrderActions";
import { useBattingOrderModel } from "./useBattingOrderModel";

export function BattingOrderSection() {
  const model = useBattingOrderModel();
  const actions = useBattingOrderActions(model);

  if (!model.activeTeam) {
    return (
      <TeamSetupGate title="Create your team before reviewing the batting order." />
    );
  }

  return <BattingOrderView actions={actions} model={model} />;
}
