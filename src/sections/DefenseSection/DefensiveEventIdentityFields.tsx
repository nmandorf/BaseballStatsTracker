import {
  defensivePositionLabels,
  defensivePositions,
} from "@/lib/defenseEngine";
import type { BallType, DefensivePosition } from "@/types/defense";
import type { Player } from "@/types/player";
import type {
  DefensiveEventFormHandlers,
  DefensiveEventFormState,
} from "./useDefensiveEventForm";

const ballTypes: BallType[] = [
  "Ground ball",
  "Fly ball",
  "Line drive",
  "Pop up",
  "Short fly",
  "Hard hit ball",
  "Weak hit ball",
];

const selectClass =
  "min-h-11 w-full min-w-0 max-w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm font-bold text-foreground outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]";

export function DefensiveEventIdentityFields({
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
      <label className="grid min-w-0 gap-1 text-sm font-bold text-foreground">
        Ball type
        <select
          className={selectClass}
          onChange={(event) =>
            handlers.changeBallType(event.target.value as BallType | "")
          }
          value={state.ballType}
        >
          <option value="">Not recorded</option>
          {ballTypes.map((ballType) => (
            <option key={ballType} value={ballType}>
              {ballType}
            </option>
          ))}
        </select>
      </label>

      <label className="grid min-w-0 gap-1 text-sm font-bold text-foreground">
        Fielder
        <select
          className={selectClass}
          disabled={state.eventType === "HIT_NO_PLAY"}
          onChange={(event) => handlers.changeFielder(event.target.value)}
          value={
            state.eventType === "HIT_NO_PLAY" ? "" : effectiveFielderId
          }
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
          onChange={(event) =>
            handlers.changePosition(
              event.target.value as DefensivePosition,
            )
          }
          value={state.position}
        >
          {defensivePositions.map((position) => (
            <option key={position} value={position}>
              {defensivePositionLabels[position]}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}
