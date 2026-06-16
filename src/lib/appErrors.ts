export type AppErrorCode =
  | "BACKEND_UNAVAILABLE"
  | "FIRST_GAME_STATE_INVALID"
  | "INVALID_JSON"
  | "PLAYER_INPUT_REQUIRED"
  | "PLAYER_NAME_REQUIRED"
  | "TEAM_NAME_REQUIRED"
  | "TEAM_NOT_FOUND";

export type AppErrorDetails = Record<string, string | number | boolean | null>;

export class AppError extends Error {
  constructor(
    readonly code: AppErrorCode,
    message: string,
    readonly status: number,
    readonly details?: AppErrorDetails,
  ) {
    super(message);
    this.name = "AppError";
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
