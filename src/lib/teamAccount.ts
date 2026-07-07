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
  const { apiKey, idToken } = getFirebaseLookupCredentials(request);
  const response = await fetchFirebaseAccountLookup(apiKey, idToken);
  const payload = await response.json() as { users?: Array<{ localId?: string; email?: string }> };
  const user = payload.users?.[0];

  if (!isVerifiedFirebaseUser(response, user)) {
    throw new AppError("AUTH_REQUIRED", "Your sign-in could not be verified. Sign in again.", 401);
  }

  return normalizeTeamAccount(user.localId, user.email);
}

function getFirebaseLookupCredentials(request: Request) {
  const idToken = getBearerToken(request);
  const apiKey = firebaseConfig.apiKey;

  if (!idToken || !apiKey) {
    throw new AppError("AUTH_REQUIRED", "Sign in again before changing team data.", 401);
  }

  return { apiKey, idToken };
}

export function normalizeTeamAccount(uid: unknown, email: unknown): TeamAccount {
  const normalizedUid = normalizeAccountUid(uid);
  const normalizedEmail = normalizeAccountEmail(email);

  if (!normalizedUid) {
    return legacyTeamAccount;
  }

  return {
    uid: normalizedUid,
    email: normalizedEmail,
  };
}

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  return authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
}

function fetchFirebaseAccountLookup(apiKey: string, idToken: string) {
  return fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
    cache: "no-store",
  });
}

function isVerifiedFirebaseUser(
  response: Response,
  user: { localId?: string; email?: string } | undefined,
): user is { localId: string; email?: string } {
  return response.ok && Boolean(user?.localId);
}

function normalizeAccountUid(uid: unknown) {
  return typeof uid === "string" ? uid.trim() : "";
}

function normalizeAccountEmail(email: unknown) {
  if (typeof email !== "string") {
    return null;
  }

  const normalizedEmail = email.trim();
  return normalizedEmail || null;
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
