const appOrigin = "https://baseball-tracker.local";

export function getSafeRedirect(path: string | null, fallback: string) {
  if (!path) {
    return fallback;
  }

  try {
    const redirectUrl = new URL(path, appOrigin);

    if (redirectUrl.origin !== appOrigin) {
      return fallback;
    }

    return `${redirectUrl.pathname}${redirectUrl.search}${redirectUrl.hash}`;
  } catch {
    return fallback;
  }
}
