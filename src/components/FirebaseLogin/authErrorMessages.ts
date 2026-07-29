type FirebaseAuthError = {
  code?: string;
  message?: string;
};

const unauthorizedDomainCode = "auth/unauthorized-domain";
const defaultEmailAuthErrorMessage = "Email sign-in could not complete. Check your email and password, then try again.";
const emailAuthErrorMessages: Record<string, string> = {
  "auth/email-already-in-use": "That email already has an account. Use Log in instead.",
  "auth/invalid-credential": "That email and password did not match an existing account.",
  "auth/invalid-email": "Enter a valid email address.",
  "auth/operation-not-allowed": "Email/password sign-in is not enabled for this Firebase project.",
  "auth/user-not-found": "That email and password did not match an existing account.",
  "auth/weak-password": "Use a password with at least 6 characters.",
  "auth/wrong-password": "That email and password did not match an existing account.",
};

function isFirebaseAuthError(error: unknown): error is FirebaseAuthError {
  return Boolean(error) && typeof error === "object";
}

export function getFirebaseAuthErrorMessage(error: unknown) {
  if (!isFirebaseAuthError(error)) {
    return "Firebase sign-in could not start.";
  }

  const errorCode = error.code ?? "";
  const errorMessage = error.message ?? "";
  const isUnauthorizedDomain = [
    errorCode === unauthorizedDomainCode,
    errorMessage.includes(unauthorizedDomainCode),
    errorMessage.toLowerCase().includes("domain is not authorized"),
  ].some(Boolean);

  if (isUnauthorizedDomain) {
    const host = typeof window === "undefined" ? "this app domain" : window.location.host;
    return `Google sign-in is blocked because ${host} is not authorized for this Firebase project. Add this host in Firebase Console > Authentication > Settings > Authorized domains, then try again.`;
  }

  if (errorCode.startsWith("auth/")) {
    return `Firebase sign-in could not complete (${errorCode}). Try again or check the Firebase Authentication provider settings.`;
  }

  return "Firebase sign-in could not complete. Try again or check the Firebase Authentication provider settings.";
}

export function getEmailAuthErrorMessage(error: unknown) {
  if (!isFirebaseAuthError(error)) {
    return defaultEmailAuthErrorMessage;
  }

  return emailAuthErrorMessages[error.code ?? ""] ?? defaultEmailAuthErrorMessage;
}
