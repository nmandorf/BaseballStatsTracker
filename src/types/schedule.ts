export type AllowedGameStartTime = "19:00" | "20:00" | "21:00";
export type ScheduleGameStatus = "SCHEDULED" | "IN_PROGRESS" | "FINAL" | "CANCELLED";
export type GamePreparationStatus = "SETUP" | "GENERATED" | "ACCEPTED" | "STARTED";

export type ScheduleWeek =
  | {
      id: string;
      kind: "BYE";
      position: number;
      localDate: string;
    }
  | {
      id: string;
      kind: "GAME";
      position: number;
      localDate: string;
      gameId: string;
      opponent: string;
      startTime: AllowedGameStartTime;
      scheduledStartAt: string;
      isHome: boolean;
      status: ScheduleGameStatus;
      preparationStatus: GamePreparationStatus;
      selectedPlayerCount: number;
      teamScore: number;
      opponentScore: number;
      result: "WIN" | "LOSS" | "TIE" | null;
      playCount: number;
    };

export type TeamSchedule = {
  teamId: string;
  timeZone: string | null;
  setupCompleted: boolean;
  weeks: ScheduleWeek[];
  serverNow: string;
};

export type ScheduleWeekInput =
  | {
      id?: string;
      kind: "BYE";
      localDate: string;
      discardPreparation?: boolean;
    }
  | {
      id?: string;
      kind: "GAME";
      localDate: string;
      opponent: string;
      startTime: AllowedGameStartTime;
      isHome: boolean;
      discardPreparation?: boolean;
    };

export type GameStartEligibility =
  | { allowed: true; eligibleAt: string }
  | {
      allowed: false;
      code:
        | "GAME_START_TOO_EARLY"
        | "GAME_START_TIME_UNVERIFIED"
        | "TEAM_GAME_ALREADY_IN_PROGRESS"
        | "GAME_NOT_STARTABLE";
      message: string;
      eligibleAt: string | null;
    };
