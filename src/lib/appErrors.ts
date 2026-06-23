export type AppErrorCode =
  | "AUTH_REQUIRED"
  | "BACKEND_UNAVAILABLE"
  | "FIRST_GAME_STATE_INVALID"
  | "GAME_NOT_STARTABLE"
  | "GAME_START_TOO_EARLY"
  | "GAME_START_TIME_UNVERIFIED"
  | "INVALID_JSON"
  | "PLAYER_INPUT_REQUIRED"
  | "PLAYER_NAME_REQUIRED"
  | "TEAM_NAME_REQUIRED"
  | "TEAM_NOT_FOUND"
  | "TEAM_GAME_ALREADY_IN_PROGRESS"
  | "SCHEDULE_ENTRY_READ_ONLY"
  | "SCHEDULE_WEEK_INVALID";

export type AppErrorDetails = Record<string, string | number | boolean | null>;

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly status: number;
  readonly details?: AppErrorDetails;

  constructor(
    code: AppErrorCode,
    message: string,
    status: number,
    details?: AppErrorDetails,
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function validationError(code: AppErrorCode, message: string, details?: AppErrorDetails) {
  return new AppError(code, message, 400, details);
}

export function notFoundError(code: AppErrorCode, message: string, details?: AppErrorDetails) {
  return new AppError(code, message, 404, details);
}

export function apiErrorResponse(
  error: unknown,
  fallback: { code: AppErrorCode; message: string; status?: number },
) {
  if (error instanceof AppError) {
    return Response.json(
      {
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      },
      { status: error.status },
    );
  }

  return Response.json(
    {
      error: {
        code: fallback.code,
        message: fallback.message,
      },
    },
    { status: fallback.status ?? 503 },
  );
}
