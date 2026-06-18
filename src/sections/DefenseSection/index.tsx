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
  allDefensivePositions,
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
  DefensiveEventType,
  DefensivePosition,
  GreatPlayImpact,
  MisplayResult,
  MisplayType,
} from "@/types/defense";

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

export function DefenseSection() {
  const router = useRouter();
  const activeTeam = useActiveTeam();
  const gameState = useFirstGameState();
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

  if (!activeTeam) {
    return <TeamSetupGate title="Create your team before tracking defense." />;
  }

  const activeTeamName = activeTeam.name;

  if (gameState.status === "PREGAME" || !gameState.lineup.length) {
    return <PregameDefensePrompt />;
  }

  if (gameState.status === "FINAL") {
    return <FinalDefensePrompt />;
  }

  const teamPhase = getCurrentTeamPhase(gameState);
  const isFielding = teamPhase === "FIELDING";
  const alignmentHalf = isFielding
    ? { inning: gameState.inning, half: gameState.half }
    : getNextHalfInning(gameState.inning, gameState.half);
  const savedAlignment = getDefensiveAlignmentForHalf(gameState, alignmentHalf.inning, alignmentHalf.half);
  const alignment = getOrCreateDefensiveAlignmentForHalf(gameState, alignmentHalf.inning, alignmentHalf.half);
  const fielderOptions = gameState.lineup;
  const effectiveFielderId = fielderId || getAssignedPlayerIdForPosition(alignment, position) || "";
  const preview = previewDefensiveEvent(gameState, buildEventInput());

  function buildEventInput(): DefensiveEventInput {
    return {
      type: eventType,
      fielderId: eventType === "HIT_NO_PLAY" ? undefined : effectiveFielderId,
      position,
      outsRecorded,
      runsAllowed,
      basesAllowed,
      ballType: ballType || undefined,
      misplayType: eventType === "MISPLAY" && misplayType ? misplayType : undefined,
      misplayResult: eventType === "MISPLAY" && misplayResult ? misplayResult : undefined,
      greatPlayImpact: eventType === "GREAT_PLAY" && greatPlayImpact ? greatPlayImpact : undefined,
      involvedPlayerIds: eventType !== "HIT_NO_PLAY" && effectiveFielderId ? [effectiveFielderId] : [],
      notes,
    };
  }

  function changeEventType(nextType: DefensiveEventType) {
    setEventType(nextType);
    setOutsRecorded(defaultOutsForEvent(nextType));
    setBasesAllowed(nextType === "EXTRA_BASES_ALLOWED" ? Math.max(1, basesAllowed) : basesAllowed);
  }

  function changeFielder(nextFielderId: string) {
    defenderSelectionWasEdited.current = true;
    setFielderId(nextFielderId);

    const assignedPosition = getAssignedPositionForPlayer(alignment, nextFielderId);

    if (assignedPosition) {
      setPosition(assignedPosition);
    }
  }

  function changePosition(nextPosition: DefensivePosition) {
    defenderSelectionWasEdited.current = true;
    setPosition(nextPosition);
    setFielderId(getAssignedPlayerIdForPosition(alignment, nextPosition) ?? "");
  }

  function changeBallType(nextBallType: BallType | "") {
    setBallType(nextBallType);

    if (!nextBallType || defenderSelectionWasEdited.current) {
      return;
    }

    const suggestedPosition = getSuggestedPositionForBallType(alignment, nextBallType);

    setPosition(suggestedPosition);
    setFielderId(getAssignedPlayerIdForPosition(alignment, suggestedPosition) ?? "");
  }

  function persistAlignment(nextAlignment = alignment) {
    saveFirstGameState(saveDefensiveAlignment(gameState, nextAlignment));
  }

  function saveEvent() {
    const nextState = saveDefensiveEvent(gameState, buildEventInput());

    saveFirstGameState(nextState);
    router.replace(getLiveGameHref(nextState));
    setNotes("");
    defenderSelectionWasEdited.current = false;
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
    <section className="min-w-0 overflow-x-clip bg-background pb-8 pt-3 sm:pb-10">
      <LiveGameHeader
        activeMode="DEFENSE"
        currentPhase={teamPhase}
        gameState={gameState}
        onEndGame={endCurrentGame}
        teamName={activeTeam.name}
      />
      <div className="mx-auto mt-3 w-full min-w-0 max-w-6xl px-3 sm:px-4 lg:px-6">
        <h1 className="sr-only">Live game defense</h1>

        {!isFielding ? (
          <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
            <p className="text-sm font-bold text-foreground">Defense is queued for the next fielding half.</p>
            <Link
              className="mt-3 inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--accent)] px-4 text-sm font-bold text-white"
              href="/stats-entry"
            >
              Open Stats Entry
            </Link>
          </div>
        ) : null}

        <div className="mt-4 grid min-w-0 gap-4 lg:grid-cols-[0.9fr_1.1fr]">
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
              <button
                className="flex size-10 items-center justify-center rounded-lg bg-[var(--surface)] text-foreground"
                onClick={undo}
                type="button"
                aria-label="Undo last play"
              >
                <RotateCcw className="size-4" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-4 grid min-w-0 grid-cols-2 gap-2">
              {eventTypes.map((type) => (
                <button
                  className={cn(
                    "min-h-11 rounded-lg px-3 text-sm font-bold",
                    eventType === type
                      ? "bg-[var(--accent)] text-white"
                      : "bg-[var(--surface)] text-foreground",
                  )}
                  key={type}
                  onClick={() => changeEventType(type)}
                  type="button"
                >
                  {defensiveEventLabels[type]}
                </button>
              ))}
            </div>

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
                  {allDefensivePositions.map((item) => (
                    <option key={item} value={item}>
                      {defensivePositionLabels[item]}
                    </option>
                  ))}
                </select>
              </label>

              {eventType === "MISPLAY" ? (
                <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                  <label className="grid min-w-0 gap-1 text-sm font-bold text-foreground">
                    Misplay type
                    <select className={selectClass} onChange={(event) => setMisplayType(event.target.value as MisplayType | "")} value={misplayType}>
                      <option value="">Not recorded</option>
                      {misplayTypes.map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                  </label>
                  <label className="grid min-w-0 gap-1 text-sm font-bold text-foreground">
                    Result
                    <select className={selectClass} onChange={(event) => setMisplayResult(event.target.value as MisplayResult | "")} value={misplayResult}>
                      <option value="">Not recorded</option>
                      {misplayResults.map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                  </label>
                </div>
              ) : null}

              {eventType === "GREAT_PLAY" ? (
                <label className="grid min-w-0 gap-1 text-sm font-bold text-foreground">
                  Impact
                  <select className={selectClass} onChange={(event) => setGreatPlayImpact(event.target.value as GreatPlayImpact | "")} value={greatPlayImpact}>
                    <option value="">Not recorded</option>
                    {greatPlayImpacts.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>
              ) : null}

              <div className="grid min-w-0 grid-cols-3 gap-2">
                <label className="grid min-w-0 gap-1 text-sm font-bold text-foreground">
                  Outs
                  <input
                    className={numberClass}
                    max={3}
                    min={0}
                    onChange={(event) => setOutsRecorded(Number(event.target.value))}
                    type="number"
                    value={outsRecorded}
                  />
                </label>
                <label className="grid min-w-0 gap-1 text-sm font-bold text-foreground">
                  Runs
                  <input
                    className={numberClass}
                    min={0}
                    onChange={(event) => setRunsAllowed(Number(event.target.value))}
                    type="number"
                    value={runsAllowed}
                  />
                </label>
                <label className="grid min-w-0 gap-1 text-sm font-bold text-foreground">
                  Extra
                  <input
                    className={numberClass}
                    min={0}
                    onChange={(event) => setBasesAllowed(Number(event.target.value))}
                    type="number"
                    value={basesAllowed}
                  />
                </label>
              </div>

              <label className="grid min-w-0 gap-1 text-sm font-bold text-foreground">
                Notes
                <textarea
                  className="min-h-24 w-full min-w-0 max-w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm font-semibold text-foreground outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
                  onChange={(event) => setNotes(event.target.value)}
                  value={notes}
                />
              </label>

              <div className="rounded-lg bg-[var(--surface)] p-3 text-sm font-semibold text-[var(--muted-foreground)]">
                {preview.summary}
              </div>

              <button
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!isFielding}
                onClick={saveEvent}
                type="button"
              >
                <Save className="size-4" aria-hidden="true" />
                Save Defensive Event
              </button>
            </div>
          </article>

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
                players={gameState.lineup}
                onChange={persistAlignment}
              />
            </div>
            {!savedAlignment ? (
              <button
                className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-4 text-sm font-bold text-white"
                onClick={() => persistAlignment()}
                type="button"
              >
                <Save className="size-4" aria-hidden="true" />
                Save Alignment
              </button>
            ) : null}
          </article>
        </div>
      </div>
    </section>
  );
}

function PregameDefensePrompt() {
  return (
    <section className="bg-background py-6 sm:py-8">
      <div className="mx-auto w-full max-w-3xl px-4 sm:px-6">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
          <p className="text-sm font-bold text-foreground">Approve a batting order before setting game defense.</p>
          <Link
            className="mt-3 inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--accent)] px-4 text-sm font-bold text-white"
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
            className="mt-3 inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--accent)] px-4 text-sm font-bold text-white"
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
