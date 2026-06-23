import firebase from "firebase/compat/app";
import "firebase/compat/analytics";
import "firebase/compat/auth";
import { firebaseConfig, requiredFirebaseConfig } from "./firebaseConfig.ts";

export function getMissingFirebaseConfig() {
  return requiredFirebaseConfig
    .filter(([, value]) => !value)
    .map(([key]) => key);
}

export function isFirebaseConfigured() {
  return getMissingFirebaseConfig().length === 0;
}

export function getFirebaseApp() {
  const missingConfig = getMissingFirebaseConfig();

  if (missingConfig.length > 0) {
    throw new Error(`Missing Firebase config: ${missingConfig.join(", ")}`);
  }

  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }

  return firebase.app();
}

export function getFirebaseAuth() {
  return getFirebaseApp().auth();
}

export async function getFirebaseAnalytics() {
  if (typeof window === "undefined") {
    return null;
  }

  const isSupported = await firebase.analytics.isSupported();

  if (!isSupported) {
    return null;
  }

  getFirebaseApp();

  return firebase.analytics();
}

export { firebase };
