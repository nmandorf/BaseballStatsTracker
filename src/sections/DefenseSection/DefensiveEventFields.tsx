import type { Player } from "@/types/player";
import {
  GreatPlayImpactField,
  MisplayFields,
} from "./DefensiveEventConditionalFields";
import { DefensiveEventIdentityFields } from "./DefensiveEventIdentityFields";
import { DefensiveEventNumberFields } from "./DefensiveEventNumberFields";
import type {
  DefensiveEventFormHandlers,
  DefensiveEventFormState,
} from "./useDefensiveEventForm";

export function DefensiveEventFields({
  effectiveFielderId,
  fielderOptions,
  handlers,
  state,
}: {
  effectiveFielderId: string;
  fielderOptions: Player[];
  handlers: DefensiveEventFormHandlers;
  state: DefensiveEventFormState;
}) {
  return (
    <>
      <DefensiveEventIdentityFields
        effectiveFielderId={effectiveFielderId}
        fielderOptions={fielderOptions}
        handlers={handlers}
        state={state}
      />
      <MisplayFields
        eventType={state.eventType}
        misplayResult={state.misplayResult}
        misplayType={state.misplayType}
        onChangeResult={handlers.setMisplayResult}
        onChangeType={handlers.setMisplayType}
      />
      <GreatPlayImpactField
        eventType={state.eventType}
        greatPlayImpact={state.greatPlayImpact}
        onChange={handlers.setGreatPlayImpact}
      />
      <DefensiveEventNumberFields
        basesAllowed={state.basesAllowed}
        outsRecorded={state.outsRecorded}
        runsAllowed={state.runsAllowed}
        onChangeBasesAllowed={handlers.setBasesAllowed}
        onChangeOutsRecorded={handlers.setOutsRecorded}
        onChangeRunsAllowed={handlers.setRunsAllowed}
      />
    </>
  );
}
