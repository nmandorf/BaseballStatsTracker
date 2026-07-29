"use client";

import { useRouter } from "next/navigation";
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
  getNextHalfInning,
} from "@/lib/defenseEngine";
import { saveFirstGameState } from "@/lib/firstGameStorage";
import { useActiveTeam } from "@/lib/teamStorage";
import { useFirstGameState } from "@/lib/useFirstGameState";
import {
  DefenseSectionLayout,
  FinalDefensePrompt,
  PregameDefensePrompt,
  type AlignmentHalf,
  type DefenseSectionContext,
} from "./DefenseView";
import {
  buildDefensiveEventInput,
  useDefensiveEventForm,
} from "./useDefensiveEventForm";

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

function getDefenseSectionContext(
  gameState: ReturnType<typeof useFirstGameState>,
): DefenseSectionContext {
  const teamPhase = getCurrentTeamPhase(gameState);
  const isFielding = teamPhase === "FIELDING";
  const alignmentHalf = getDefenseAlignmentHalf(gameState, isFielding);

  return {
    alignment: getOrCreateDefensiveAlignmentForHalf(
      gameState,
      alignmentHalf.inning,
      alignmentHalf.half,
    ),
    alignmentHalf,
    isFielding,
    savedAlignment: getDefensiveAlignmentForHalf(
      gameState,
      alignmentHalf.inning,
      alignmentHalf.half,
    ),
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
