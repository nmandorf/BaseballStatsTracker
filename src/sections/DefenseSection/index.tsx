"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RotateCcw, Save } from "lucide-react";
import { DefensiveAlignmentEditor } from "@/components/DefensiveAlignmentEditor";
import { LiveGameHeader } from "@/components/LiveGameHeader";
import { StatusPill } from "@/components/StatusPill";
import { TeamSetupGate } from "@/components/TeamSetupGate";
import {
  endGame,
  getCurrentTeamPhase,
  getDefensiveAlignmentForHalf,
  getLiveGameHref,
  getOrCreateDefensiveAlignmentForHalf,
  previewDefensiveEvent,
  saveDefensiveAlignment,
  saveDefensiveEvent,
  undoLastPlay,
} from "@/lib/gameEngine";
import {
  defensivePositions,
  defensiveEventLabels,
  defensivePositionLabels,
  getAssignedPlayerIdForPosition,
  getAssignedPositionForPlayer,
  getNextHalfInning,
  getSuggestedPositionForBallType,
} from "@/lib/defenseEngine";
import { saveFirstGameState } from "@/lib/firstGameStorage";
import { useActiveTeam } from "@/lib/teamStorage";
import { useFirstGameState } from "@/lib/useFirstGameState";
import { cn } from "@/lib/utils";
import type { DefensiveEventInput } from "@/types/game";
import type {
  BallType,
  DefensiveAlignment,
  DefensiveEventType,
  DefensivePosition,
  GreatPlayImpact,
  InningHalf,
  MisplayResult,
  MisplayType,
} from "@/types/defense";
import type { Player } from "@/types/player";

const eventTypes: DefensiveEventType[] = [
  "ROUTINE_OUT",
  "HIT_NO_PLAY",
  "MISPLAY",
  "GREAT_PLAY",
  "EXTRA_BASES_ALLOWED",
  "DOUBLE_PLAY",
];

const ballTypes: BallType[] = ["Ground ball", "Fly ball", "Line drive", "Pop up", "Short fly", "Hard hit ball", "Weak hit ball"];
const misplayTypes: MisplayType[] = ["Fielding mistake", "Throwing mistake", "Catching mistake", "Missed fly ball", "Bad decision", "Did not cover base", "Did not back up play"];
const misplayResults: MisplayResult[] = ["Batter reached base", "Runner advanced", "Run scored", "Extra base allowed", "Out missed"];
const greatPlayImpacts: GreatPlayImpact[] = ["Saved an out", "Saved a run", "Prevented extra base", "Ended inning", "Double play started"];

const selectClass = "min-h-11 w-full min-w-0 max-w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm font-bold text-foreground outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]";
const numberClass = "min-h-11 w-full min-w-0 max-w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 text-sm font-bold tabular-nums text-foreground outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] sm:px-3";

type AlignmentHalf = {
  inning: number;
  half: InningHalf;
};

type DefensiveEventFormState = {
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

type DefensiveEventFormHandlers = {
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

type DefenseSectionContext = {
  alignment: DefensiveAlignment;
  alignmentHalf: AlignmentHalf;
  isFielding: boolean;
  savedAlignment: DefensiveAlignment | null;
  teamPhase: ReturnType<typeof getCurrentTeamPhase>;
};

type DefensiveEventFormController = {
  clearAfterSave: () => void;
  draft: DefensiveEventDraft;
  handlers: DefensiveEventFormHandlers;
  state: DefensiveEventFormState;
};

export function DefenseSection() {
  const activeTeam = useActiveTeam();

  if (!activeTeam) {
    return <TeamSetupGate title="Create your team before tracking defense." />;
  }

  return <TeamDefenseSection activeTeamName={activeTeam.name} />;
}

function TeamDefenseSection({ activeTeamName }: { activeTeamName: string }) {
  const router = useRouter();
  const gameState = useFirstGameState();
  const unavailablePrompt = getUnavailableDefensePrompt(gameState);

  if (unavailablePrompt) {
    return unavailablePrompt;
  }

  return <LiveDefenseSection activeTeamName={activeTeamName} gameState={gameState} router={router} />;
}

function getUnavailableDefensePrompt(gameState: ReturnType<typeof useFirstGameState>) {
  if (gameState.status === "PREGAME" || !gameState.lineup.length) return <PregameDefensePrompt />;
  if (gameState.status === "FINAL") return <FinalDefensePrompt />;
  return null;
}

function LiveDefenseSection({
  activeTeamName,
  gameState,
  router,
}: {
  activeTeamName: string;
  gameState: ReturnType<typeof useFirstGameState>;
  router: ReturnType<typeof useRouter>;
}) {
  const context = getDefenseSectionContext(gameState);
  const eventForm = useDefensiveEventForm(context.alignment);
  const eventInput = buildDefensiveEventInput(eventForm.draft);
  const preview = previewDefensiveEvent(gameState, eventInput);

  function persistAlignment(nextAlignment = context.alignment) {
    saveFirstGameState(saveDefensiveAlignment(gameState, nextAlignment));
  }

  function saveEvent() {
    const nextState = saveDefensiveEvent(gameState, eventInput);

    saveFirstGameState(nextState);
    router.replace(getLiveGameHref(nextState));
    eventForm.clearAfterSave();
  }

  function undo() {
    const previousState = undoLastPlay(gameState);

    saveFirstGameState(previousState);
    router.replace(getLiveGameHref(previousState));
  }

  function endCurrentGame() {
    saveFirstGameState(endGame(gameState, undefined, activeTeamName));
    router.replace("/stats-entry");
  }

  return (
    <DefenseSectionLayout
      activeTeamName={activeTeamName}
      context={context}
      eventForm={eventForm}
      gameState={gameState}
      previewSummary={preview.summary}
      onEndGame={endCurrentGame}
      onPersistAlignment={persistAlignment}
      onSaveEvent={saveEvent}
      onUndo={undo}
    />
  );
}

function DefenseSectionLayout({
  activeTeamName,
  context,
  eventForm,
  gameState,
  previewSummary,
  onEndGame,
  onPersistAlignment,
  onSaveEvent,
  onUndo,
}: {
  activeTeamName: string;
  context: DefenseSectionContext;
  eventForm: DefensiveEventFormController;
  gameState: ReturnType<typeof useFirstGameState>;
  previewSummary: string;
  onEndGame: () => void;
  onPersistAlignment: (nextAlignment?: DefensiveAlignment) => void;
  onSaveEvent: () => void;
  onUndo: () => void;
}) {
  return (
    <section className="min-w-0 overflow-x-clip bg-background pb-28 pt-3 sm:pb-32">
      <LiveGameHeader
        activeMode="DEFENSE"
        currentPhase={context.teamPhase}
        gameState={gameState}
        onEndGame={onEndGame}
        teamName={activeTeamName}
      />
      <div className="mx-auto mt-3 w-full min-w-0 max-w-6xl px-3 sm:px-4 lg:px-6">
        <h1 className="sr-only">Live game defense</h1>

        {!context.isFielding ? <QueuedDefenseNotice /> : null}

        <div className="mt-4 grid min-w-0 gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <DefensiveEventCard
            effectiveFielderId={eventForm.draft.effectiveFielderId}
            fielderOptions={gameState.lineup}
            handlers={eventForm.handlers}
            isFielding={context.isFielding}
            previewSummary={previewSummary}
            state={eventForm.state}
          />

          <DefensiveAlignmentCard
            alignment={context.alignment}
            alignmentHalf={context.alignmentHalf}
            lockedPitcherPlayerId={gameState.lockedPitcherPlayerId}
            players={gameState.lineup}
            priorAlignments={gameState.defensiveAlignments}
            savedAlignment={context.savedAlignment}
            onSaveAlignment={onPersistAlignment}
          />
        </div>
      </div>

      <DefenseActionBar
        canUndo={Boolean(gameState.history.length)}
        isFielding={context.isFielding}
        onSaveEvent={onSaveEvent}
        onUndo={onUndo}
      />
    </section>
  );
}

function getDefenseSectionContext(gameState: ReturnType<typeof useFirstGameState>): DefenseSectionContext {
  const teamPhase = getCurrentTeamPhase(gameState);
  const isFielding = teamPhase === "FIELDING";
  const alignmentHalf = getDefenseAlignmentHalf(gameState, isFielding);

  return {
    alignment: getOrCreateDefensiveAlignmentForHalf(gameState, alignmentHalf.inning, alignmentHalf.half),
    alignmentHalf,
    isFielding,
    savedAlignment: getDefensiveAlignmentForHalf(gameState, alignmentHalf.inning, alignmentHalf.half),
    teamPhase,
  };
}

function getDefenseAlignmentHalf(
  gameState: ReturnType<typeof useFirstGameState>,
  isFielding: boolean,
): AlignmentHalf {
  return isFielding
    ? { inning: gameState.inning, half: gameState.half }
    : getNextHalfInning(gameState.inning, gameState.half);
}

function useDefensiveEventForm(alignment: DefensiveAlignment): DefensiveEventFormController {
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

  const draft = {
    ...state,
    effectiveFielderId: getEffectiveFielderId(fielderId, alignment, position),
  };

  return {
    clearAfterSave: () => clearDefensiveEventFormAfterSave({ defenderSelectionWasEdited, setNotes }),
    draft,
    handlers: {
      changeBallType: (nextBallType) => changeDefensiveBallType({
        alignment,
        defenderSelectionWasEdited,
        nextBallType,
        setBallType,
        setFielderId,
        setPosition,
      }),
      changeEventType: (nextType) => changeDefensiveEventType({
        basesAllowed,
        nextType,
        setBasesAllowed,
        setEventType,
        setOutsRecorded,
      }),
      changeFielder: (nextFielderId) => changeDefensiveFielder({
        alignment,
        defenderSelectionWasEdited,
        nextFielderId,
        setFielderId,
        setPosition,
      }),
      changePosition: (nextPosition) => changeDefensivePosition({
        alignment,
        defenderSelectionWasEdited,
        nextPosition,
        setFielderId,
        setPosition,
      }),
      setBasesAllowed,
      setGreatPlayImpact,
      setMisplayResult,
      setMisplayType,
      setNotes,
      setOutsRecorded,
      setRunsAllowed,
    },
    state,
  };
}

function getEffectiveFielderId(
  fielderId: string,
  alignment: DefensiveAlignment,
  position: DefensivePosition,
) {
  return fielderId || getAssignedPlayerIdForPosition(alignment, position) || "";
}

function changeDefensiveEventType({
  basesAllowed,
  nextType,
  setBasesAllowed,
  setEventType,
  setOutsRecorded,
}: {
  basesAllowed: number;
  nextType: DefensiveEventType;
  setBasesAllowed: (basesAllowed: number) => void;
  setEventType: (eventType: DefensiveEventType) => void;
  setOutsRecorded: (outsRecorded: number) => void;
}) {
  setEventType(nextType);
  setOutsRecorded(defaultOutsForEvent(nextType));
  setBasesAllowed(getBasesAllowedForEventType(nextType, basesAllowed));
}

function getBasesAllowedForEventType(nextType: DefensiveEventType, basesAllowed: number) {
  return nextType === "EXTRA_BASES_ALLOWED" ? Math.max(1, basesAllowed) : basesAllowed;
}

function changeDefensiveFielder({
  alignment,
  defenderSelectionWasEdited,
  nextFielderId,
  setFielderId,
  setPosition,
}: {
  alignment: DefensiveAlignment;
  defenderSelectionWasEdited: { current: boolean };
  nextFielderId: string;
  setFielderId: (fielderId: string) => void;
  setPosition: (position: DefensivePosition) => void;
}) {
  defenderSelectionWasEdited.current = true;
  setFielderId(nextFielderId);
  setAssignedPositionForFielder(alignment, nextFielderId, setPosition);
}

function setAssignedPositionForFielder(
  alignment: DefensiveAlignment,
  nextFielderId: string,
  setPosition: (position: DefensivePosition) => void,
) {
  const assignedPosition = getAssignedPositionForPlayer(alignment, nextFielderId);

  if (assignedPosition) {
    setPosition(assignedPosition);
  }
}

function changeDefensivePosition({
  alignment,
  defenderSelectionWasEdited,
  nextPosition,
  setFielderId,
  setPosition,
}: {
  alignment: DefensiveAlignment;
  defenderSelectionWasEdited: { current: boolean };
  nextPosition: DefensivePosition;
  setFielderId: (fielderId: string) => void;
  setPosition: (position: DefensivePosition) => void;
}) {
  defenderSelectionWasEdited.current = true;
  setPosition(nextPosition);
  setFielderId(getAssignedPlayerIdForPosition(alignment, nextPosition) ?? "");
}

function changeDefensiveBallType({
  alignment,
  defenderSelectionWasEdited,
  nextBallType,
  setBallType,
  setFielderId,
  setPosition,
}: {
  alignment: DefensiveAlignment;
  defenderSelectionWasEdited: { current: boolean };
  nextBallType: BallType | "";
  setBallType: (ballType: BallType | "") => void;
  setFielderId: (fielderId: string) => void;
  setPosition: (position: DefensivePosition) => void;
}) {
  setBallType(nextBallType);

  if (shouldKeepEditedDefender(nextBallType, defenderSelectionWasEdited.current)) {
    return;
  }

  setSuggestedFielderForBallType({ alignment, nextBallType: nextBallType as BallType, setFielderId, setPosition });
}

function shouldKeepEditedDefender(nextBallType: BallType | "", wasEdited: boolean) {
  return !nextBallType || wasEdited;
}

function setSuggestedFielderForBallType({
  alignment,
  nextBallType,
  setFielderId,
  setPosition,
}: {
  alignment: DefensiveAlignment;
  nextBallType: BallType;
  setFielderId: (fielderId: string) => void;
  setPosition: (position: DefensivePosition) => void;
}) {
  const suggestedPosition = getSuggestedPositionForBallType(alignment, nextBallType);

  setPosition(suggestedPosition);
  setFielderId(getAssignedPlayerIdForPosition(alignment, suggestedPosition) ?? "");
}

function clearDefensiveEventFormAfterSave({
  defenderSelectionWasEdited,
  setNotes,
}: {
  defenderSelectionWasEdited: { current: boolean };
  setNotes: (notes: string) => void;
}) {
  setNotes("");
  defenderSelectionWasEdited.current = false;
}

function buildDefensiveEventInput(draft: DefensiveEventDraft): DefensiveEventInput {
  const fielderId = getDefensiveEventFielderId(draft);

  return {
    type: draft.eventType,
    fielderId,
    position: draft.position,
    outsRecorded: draft.outsRecorded,
    runsAllowed: draft.runsAllowed,
    basesAllowed: draft.basesAllowed,
    ballType: optionalDefenseField(draft.ballType),
    misplayType: getMisplayField(draft.eventType, draft.misplayType),
    misplayResult: getMisplayField(draft.eventType, draft.misplayResult),
    greatPlayImpact: getGreatPlayImpactField(draft),
    involvedPlayerIds: getDefensiveEventInvolvedPlayers(fielderId),
    notes: draft.notes,
  };
}

function getDefensiveEventFielderId(draft: DefensiveEventDraft) {
  if (draft.eventType === "HIT_NO_PLAY") {
    return undefined;
  }

  return optionalDefenseField(draft.effectiveFielderId);
}

function optionalDefenseField<T>(value: T | "") {
  return value || undefined;
}

function getMisplayField<T>(eventType: DefensiveEventType, value: T | "") {
  if (eventType !== "MISPLAY") {
    return undefined;
  }

  return optionalDefenseField(value);
}

function getGreatPlayImpactField(draft: DefensiveEventDraft) {
  if (draft.eventType !== "GREAT_PLAY") {
    return undefined;
  }

  return optionalDefenseField(draft.greatPlayImpact);
}

function getDefensiveEventInvolvedPlayers(fielderId: string | undefined) {
  return fielderId ? [fielderId] : [];
}

function QueuedDefenseNotice() {
  return (
    <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
      <p className="text-sm font-bold text-foreground">Defense is queued for the next fielding half.</p>
      <Link
        className="btn-base btn-primary mt-3 min-h-11 px-4 text-sm"
        href="/stats-entry"
      >
        Open Stats Entry
      </Link>
    </div>
  );
}

function DefensiveEventCard({
  effectiveFielderId,
  fielderOptions,
  handlers,
  isFielding,
  previewSummary,
  state,
}: {
  effectiveFielderId: string;
  fielderOptions: Player[];
  handlers: DefensiveEventFormHandlers;
  isFielding: boolean;
  previewSummary: string;
  state: DefensiveEventFormState;
}) {
  const {
    changeBallType,
    changeEventType,
    changeFielder,
    changePosition,
    setBasesAllowed,
    setGreatPlayImpact,
    setMisplayResult,
    setMisplayType,
    setNotes,
    setOutsRecorded,
    setRunsAllowed,
  } = handlers;
  const {
    eventType,
    position,
    outsRecorded,
    runsAllowed,
    basesAllowed,
    ballType,
    misplayType,
    misplayResult,
    greatPlayImpact,
    notes,
  } = state;

  return (
    <article className="min-w-0 rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm shadow-foreground/[0.035]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
            Event
          </p>
          <h2 className="mt-1 text-lg font-semibold text-foreground">
            {defensiveEventLabels[eventType]}
          </h2>
        </div>
        <StatusPill tone={isFielding ? "ready" : "review"}>
          {isFielding ? "Live" : "Queued"}
        </StatusPill>
      </div>

      <DefensiveEventTypePicker eventType={eventType} onChange={changeEventType} />

      <div className="mt-4 grid min-w-0 gap-3">
        <label className="grid min-w-0 gap-1 text-sm font-bold text-foreground">
          Ball type
          <select
            className={selectClass}
            onChange={(event) => changeBallType(event.target.value as BallType | "")}
            value={ballType}
          >
            <option value="">Not recorded</option>
            {ballTypes.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>

        <label className="grid min-w-0 gap-1 text-sm font-bold text-foreground">
          Fielder
          <select
            className={selectClass}
            disabled={eventType === "HIT_NO_PLAY"}
            onChange={(event) => changeFielder(event.target.value)}
            value={eventType === "HIT_NO_PLAY" ? "" : effectiveFielderId}
          >
            <option value="">No fielder</option>
            {fielderOptions.map((player) => (
              <option key={player.id} value={player.id}>
                {player.name}
              </option>
            ))}
          </select>
        </label>

        <label className="grid min-w-0 gap-1 text-sm font-bold text-foreground">
          Position
          <select
            className={selectClass}
            onChange={(event) => changePosition(event.target.value as DefensivePosition)}
            value={position}
          >
            {defensivePositions.map((item) => (
              <option key={item} value={item}>
                {defensivePositionLabels[item]}
              </option>
            ))}
          </select>
        </label>

        <MisplayFields
          eventType={eventType}
          misplayResult={misplayResult}
          misplayType={misplayType}
          onChangeResult={setMisplayResult}
          onChangeType={setMisplayType}
        />

        <GreatPlayImpactField
          eventType={eventType}
          greatPlayImpact={greatPlayImpact}
          onChange={setGreatPlayImpact}
        />

        <DefensiveEventNumberFields
          basesAllowed={basesAllowed}
          outsRecorded={outsRecorded}
          runsAllowed={runsAllowed}
          onChangeBasesAllowed={setBasesAllowed}
          onChangeOutsRecorded={setOutsRecorded}
          onChangeRunsAllowed={setRunsAllowed}
        />

        <label className="grid min-w-0 gap-1 text-sm font-bold text-foreground">
          Notes
          <textarea
            className="min-h-24 w-full min-w-0 max-w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm font-semibold text-foreground outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
            onChange={(event) => setNotes(event.target.value)}
            value={notes}
          />
        </label>

        <div className="rounded-lg bg-[var(--surface)] p-3 text-sm font-semibold text-[var(--muted-foreground)]">
          {previewSummary}
        </div>
      </div>
    </article>
  );
}

function DefensiveEventTypePicker({
  eventType,
  onChange,
}: {
  eventType: DefensiveEventType;
  onChange: (nextType: DefensiveEventType) => void;
}) {
  return (
    <div className="mt-4 grid min-w-0 grid-cols-2 gap-2">
      {eventTypes.map((type) => (
        <button
          className={cn(
            "btn-base min-h-11 px-3 text-sm",
            eventType === type
              ? "btn-choice-selected"
              : "btn-choice",
          )}
          aria-pressed={eventType === type}
          key={type}
          onClick={() => onChange(type)}
          type="button"
        >
          {defensiveEventLabels[type]}
        </button>
      ))}
    </div>
  );
}

function MisplayFields({
  eventType,
  misplayResult,
  misplayType,
  onChangeResult,
  onChangeType,
}: {
  eventType: DefensiveEventType;
  misplayResult: MisplayResult | "";
  misplayType: MisplayType | "";
  onChangeResult: (nextMisplayResult: MisplayResult | "") => void;
  onChangeType: (nextMisplayType: MisplayType | "") => void;
}) {
  if (eventType !== "MISPLAY") {
    return null;
  }

  return (
    <div className="grid min-w-0 gap-3 sm:grid-cols-2">
      <label className="grid min-w-0 gap-1 text-sm font-bold text-foreground">
        Misplay type
        <select className={selectClass} onChange={(event) => onChangeType(event.target.value as MisplayType | "")} value={misplayType}>
          <option value="">Not recorded</option>
          {misplayTypes.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </label>
      <label className="grid min-w-0 gap-1 text-sm font-bold text-foreground">
        Result
        <select className={selectClass} onChange={(event) => onChangeResult(event.target.value as MisplayResult | "")} value={misplayResult}>
          <option value="">Not recorded</option>
          {misplayResults.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </label>
    </div>
  );
}

function GreatPlayImpactField({
  eventType,
  greatPlayImpact,
  onChange,
}: {
  eventType: DefensiveEventType;
  greatPlayImpact: GreatPlayImpact | "";
  onChange: (nextGreatPlayImpact: GreatPlayImpact | "") => void;
}) {
  if (eventType !== "GREAT_PLAY") {
    return null;
  }

  return (
    <label className="grid min-w-0 gap-1 text-sm font-bold text-foreground">
      Impact
      <select className={selectClass} onChange={(event) => onChange(event.target.value as GreatPlayImpact | "")} value={greatPlayImpact}>
        <option value="">Not recorded</option>
        {greatPlayImpacts.map((item) => <option key={item} value={item}>{item}</option>)}
      </select>
    </label>
  );
}

function DefensiveEventNumberFields({
  basesAllowed,
  outsRecorded,
  runsAllowed,
  onChangeBasesAllowed,
  onChangeOutsRecorded,
  onChangeRunsAllowed,
}: {
  basesAllowed: number;
  outsRecorded: number;
  runsAllowed: number;
  onChangeBasesAllowed: (nextBasesAllowed: number) => void;
  onChangeOutsRecorded: (nextOutsRecorded: number) => void;
  onChangeRunsAllowed: (nextRunsAllowed: number) => void;
}) {
  return (
    <div className="grid min-w-0 grid-cols-3 gap-2">
      <label className="grid min-w-0 gap-1 text-sm font-bold text-foreground">
        Outs
        <input
          className={numberClass}
          max={3}
          min={0}
          onChange={(event) => onChangeOutsRecorded(Number(event.target.value))}
          type="number"
          value={outsRecorded}
        />
      </label>
      <label className="grid min-w-0 gap-1 text-sm font-bold text-foreground">
        Runs
        <input
          className={numberClass}
          min={0}
          onChange={(event) => onChangeRunsAllowed(Number(event.target.value))}
          type="number"
          value={runsAllowed}
        />
      </label>
      <label className="grid min-w-0 gap-1 text-sm font-bold text-foreground">
        Extra
        <input
          className={numberClass}
          min={0}
          onChange={(event) => onChangeBasesAllowed(Number(event.target.value))}
          type="number"
          value={basesAllowed}
        />
      </label>
    </div>
  );
}

function DefensiveAlignmentCard({
  alignment,
  alignmentHalf,
  lockedPitcherPlayerId,
  players,
  priorAlignments,
  savedAlignment,
  onSaveAlignment,
}: {
  alignment: DefensiveAlignment;
  alignmentHalf: AlignmentHalf;
  lockedPitcherPlayerId: string | null;
  players: Player[];
  priorAlignments: DefensiveAlignment[];
  savedAlignment: DefensiveAlignment | null;
  onSaveAlignment: (nextAlignment?: DefensiveAlignment) => void;
}) {
  return (
    <article className="min-w-0 rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm shadow-foreground/[0.035]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
            Alignment
          </p>
          <h2 className="mt-1 text-lg font-semibold text-foreground">
            {alignmentHalf.half} {alignmentHalf.inning}
          </h2>
        </div>
        <StatusPill tone={savedAlignment ? "done" : "review"}>
          {savedAlignment ? "Saved" : "Draft"}
        </StatusPill>
      </div>
      <div className="mt-4">
        <DefensiveAlignmentEditor
          alignment={alignment}
          lockedPitcherPlayerId={lockedPitcherPlayerId}
          players={players}
          priorAlignments={priorAlignments}
          onChange={onSaveAlignment}
        />
      </div>
      {!savedAlignment ? (
        <button
          className="btn-base btn-secondary mt-3 min-h-11 w-full px-4 text-sm"
          onClick={() => onSaveAlignment()}
          type="button"
        >
          <Save className="size-4" aria-hidden="true" />
          Save Alignment
        </button>
      ) : null}
    </article>
  );
}

function DefenseActionBar({
  canUndo,
  isFielding,
  onSaveEvent,
  onUndo,
}: {
  canUndo: boolean;
  isFielding: boolean;
  onSaveEvent: () => void;
  onUndo: () => void;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--border)] bg-[var(--card)]/95 px-3 py-3 shadow-2xl shadow-foreground/10 backdrop-blur">
      <div className="mx-auto grid w-full max-w-md grid-cols-[0.72fr_1.28fr] gap-2">
        <button
          className="btn-base btn-secondary min-h-12 text-sm"
          disabled={!canUndo}
          onClick={onUndo}
          type="button"
        >
          <RotateCcw className="size-4" aria-hidden="true" />
          Undo
        </button>
        <button
          className="btn-base btn-primary min-h-12 px-3 text-sm"
          disabled={!isFielding}
          onClick={onSaveEvent}
          type="button"
        >
          <Save className="size-4" aria-hidden="true" />
          Save Defensive Event
        </button>
      </div>
    </div>
  );
}

function PregameDefensePrompt() {
  return (
    <section className="bg-background py-6 sm:py-8">
      <div className="mx-auto w-full max-w-3xl px-4 sm:px-6">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
          <p className="text-sm font-bold text-foreground">Approve a batting order before setting game defense.</p>
          <Link
            className="btn-base btn-primary mt-3 min-h-11 px-4 text-sm"
            href="/batting-order"
          >
            Open Batting Order
          </Link>
        </div>
      </div>
    </section>
  );
}

function FinalDefensePrompt() {
  return (
    <section className="bg-background py-6 sm:py-8">
      <div className="mx-auto w-full max-w-3xl px-4 sm:px-6">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
          <p className="text-sm font-bold text-foreground">This game is final.</p>
          <Link
            className="btn-base btn-primary mt-3 min-h-11 px-4 text-sm"
            href="/stats"
          >
            Open Stats
          </Link>
        </div>
      </div>
    </section>
  );
}

function defaultOutsForEvent(type: DefensiveEventType) {
  if (type === "DOUBLE_PLAY") return 2;
  if (type === "ROUTINE_OUT" || type === "GREAT_PLAY") return 1;
  return 0;
}
