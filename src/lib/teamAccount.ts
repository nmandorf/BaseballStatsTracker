import { AppError } from "./appErrors.ts";
import { firebaseConfig } from "./firebaseConfig.ts";

export type TeamAccount = {
  uid: string;
  email: string | null;
};

export const legacyTeamAccount: TeamAccount = {
  uid: "legacy",
  email: null,
};

export async function readVerifiedTeamAccountFromRequest(request: Request): Promise<TeamAccount> {
  const authorization = request.headers.get("authorization") ?? "";
  const idToken = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  const apiKey = firebaseConfig.apiKey;

  if (!idToken || !apiKey) {
    throw new AppError("AUTH_REQUIRED", "Sign in again before changing team data.", 401);
  }

  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
    cache: "no-store",
  });
  const payload = await response.json() as { users?: Array<{ localId?: string; email?: string }> };
  const user = payload.users?.[0];

  if (!response.ok || !user?.localId) {
    throw new AppError("AUTH_REQUIRED", "Your sign-in could not be verified. Sign in again.", 401);
  }

  return normalizeTeamAccount(user.localId, user.email);
}

export function normalizeTeamAccount(uid: unknown, email: unknown): TeamAccount {
  const normalizedUid = typeof uid === "string" ? uid.trim() : "";
  const normalizedEmail = typeof email === "string" && email.trim()
    ? email.trim()
    : null;

  if (!normalizedUid) {
    return legacyTeamAccount;
  }

  return {
    uid: normalizedUid,
    email: normalizedEmail,
  };
}

export function canUseStoredTeam(
  ownerUid: string | undefined,
  accountUid: string | null,
  isAuthConfigured: boolean,
) {
  if (!isAuthConfigured) {
    return true;
  }

  return Boolean(ownerUid && accountUid && ownerUid === accountUid);
}
