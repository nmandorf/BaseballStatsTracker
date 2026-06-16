export type TeamAccount = {
  uid: string;
  email: string | null;
};

export const legacyTeamAccount: TeamAccount = {
  uid: "legacy",
  email: null,
};

const userIdHeader = "x-baseball-user-id";
const userEmailHeader = "x-baseball-user-email";

export function readTeamAccountFromRequest(request: Request): TeamAccount {
  return normalizeTeamAccount(
    request.headers.get(userIdHeader),
    request.headers.get(userEmailHeader),
  );
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

export function teamAccountHeaders(
  account: TeamAccount | null,
  baseHeaders: Record<string, string> = {},
) {
  if (!account?.uid) {
    return baseHeaders;
  }

  return {
    ...baseHeaders,
    "X-Baseball-User-Id": account.uid,
    "X-Baseball-User-Email": account.email ?? "",
  };
}
