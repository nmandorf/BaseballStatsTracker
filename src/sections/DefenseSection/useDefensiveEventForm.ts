import { useRef, useState } from "react";
import {
  getAssignedPlayerIdForPosition,
  getAssignedPositionForPlayer,
  getSuggestedPositionForBallType,
} from "@/lib/defenseEngine";
import type { DefensiveEventInput } from "@/types/game";
import type {
  BallType,
  DefensiveAlignment,
  DefensiveEventType,
  DefensivePosition,
  GreatPlayImpact,
  MisplayResult,
  MisplayType,
} from "@/types/defense";

export type DefensiveEventFormState = {
  eventType: DefensiveEventType;
  position: DefensivePosition;
  outsRecorded: number;
  runsAllowed: number;
  basesAllowed: number;
  ballType: BallType | "";
  misplayType: MisplayType | "";
  misplayResult: MisplayResult | "";
  greatPlayImpact: GreatPlayImpact | "";
  notes: string;
};

export type DefensiveEventFormHandlers = {
  changeEventType: (nextType: DefensiveEventType) => void;
  changeBallType: (nextBallType: BallType | "") => void;
  changeFielder: (nextFielderId: string) => void;
  changePosition: (nextPosition: DefensivePosition) => void;
  setMisplayType: (nextMisplayType: MisplayType | "") => void;
  setMisplayResult: (nextMisplayResult: MisplayResult | "") => void;
  setGreatPlayImpact: (nextGreatPlayImpact: GreatPlayImpact | "") => void;
  setOutsRecorded: (nextOutsRecorded: number) => void;
  setRunsAllowed: (nextRunsAllowed: number) => void;
  setBasesAllowed: (nextBasesAllowed: number) => void;
  setNotes: (nextNotes: string) => void;
};

type DefensiveEventDraft = DefensiveEventFormState & {
  effectiveFielderId: string;
};

export function useDefensiveEventForm(alignment: DefensiveAlignment) {
  const [eventType, setEventType] = useState<DefensiveEventType>("ROUTINE_OUT");
  const [fielderId, setFielderId] = useState("");
  const [position, setPosition] = useState<DefensivePosition>("SS");
  const [outsRecorded, setOutsRecorded] = useState(1);
  const [runsAllowed, setRunsAllowed] = useState(0);
  const [basesAllowed, setBasesAllowed] = useState(0);
  const [ballType, setBallType] = useState<BallType | "">("");
  const [misplayType, setMisplayType] = useState<MisplayType | "">("");
  const [misplayResult, setMisplayResult] = useState<MisplayResult | "">("");
  const [greatPlayImpact, setGreatPlayImpact] = useState<GreatPlayImpact | "">("");
  const [notes, setNotes] = useState("");
  const defenderSelectionWasEdited = useRef(false);
  const state = {
    ballType,
    basesAllowed,
    eventType,
    greatPlayImpact,
    misplayResult,
    misplayType,
    notes,
    outsRecorded,
    position,
    runsAllowed,
  };

  return {
    clearAfterSave: () => {
      setNotes("");
      defenderSelectionWasEdited.current = false;
    },
    draft: {
      ...state,
      effectiveFielderId: fielderId || getAssignedPlayerIdForPosition(alignment, position) || "",
    },
    handlers: {
      changeBallType: (nextBallType: BallType | "") => {
        setBallType(nextBallType);
        if (!nextBallType || defenderSelectionWasEdited.current) return;
        const suggestedPosition = getSuggestedPositionForBallType(alignment, nextBallType);
        setPosition(suggestedPosition);
        setFielderId(getAssignedPlayerIdForPosition(alignment, suggestedPosition) ?? "");
      },
      changeEventType: (nextType: DefensiveEventType) => {
        setEventType(nextType);
        setOutsRecorded(defaultOutsForEvent(nextType));
        setBasesAllowed(nextType === "EXTRA_BASES_ALLOWED" ? Math.max(1, basesAllowed) : basesAllowed);
      },
      changeFielder: (nextFielderId: string) => {
        defenderSelectionWasEdited.current = true;
        setFielderId(nextFielderId);
        const assignedPosition = getAssignedPositionForPlayer(alignment, nextFielderId);
        if (assignedPosition) setPosition(assignedPosition);
      },
      changePosition: (nextPosition: DefensivePosition) => {
        defenderSelectionWasEdited.current = true;
        setPosition(nextPosition);
        setFielderId(getAssignedPlayerIdForPosition(alignment, nextPosition) ?? "");
      },
      setBasesAllowed,
      setGreatPlayImpact,
      setMisplayResult,
      setMisplayType,
      setNotes,
      setOutsRecorded,
      setRunsAllowed,
    } satisfies DefensiveEventFormHandlers,
    state,
  };
}

export function buildDefensiveEventInput(draft: DefensiveEventDraft): DefensiveEventInput {
  const fielderId = draft.eventType === "HIT_NO_PLAY" ? undefined : optionalField(draft.effectiveFielderId);
  return {
    type: draft.eventType,
    fielderId,
    position: draft.position,
    outsRecorded: draft.outsRecorded,
    runsAllowed: draft.runsAllowed,
    basesAllowed: draft.basesAllowed,
    ballType: optionalField(draft.ballType),
    misplayType: draft.eventType === "MISPLAY" ? optionalField(draft.misplayType) : undefined,
    misplayResult: draft.eventType === "MISPLAY" ? optionalField(draft.misplayResult) : undefined,
    greatPlayImpact: draft.eventType === "GREAT_PLAY" ? optionalField(draft.greatPlayImpact) : undefined,
    involvedPlayerIds: fielderId ? [fielderId] : [],
    notes: draft.notes,
  };
}

function optionalField<T>(value: T | "") {
  return value || undefined;
}

function defaultOutsForEvent(type: DefensiveEventType) {
  if (type === "DOUBLE_PLAY") return 2;
  if (type === "ROUTINE_OUT" || type === "GREAT_PLAY") return 1;
  return 0;
}
