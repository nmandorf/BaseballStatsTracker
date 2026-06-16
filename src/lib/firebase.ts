import firebase from "firebase/compat/app";
import "firebase/compat/analytics";
import "firebase/compat/auth";

const defaultFirebaseConfig = {
  apiKey: "AIzaSyAt9w0epL6FPIx_5eT_80Uj43IzwwATs_k",
  authDomain: "baseball-stats-tracker-c9d51.firebaseapp.com",
  projectId: "baseball-stats-tracker-c9d51",
  storageBucket: "baseball-stats-tracker-c9d51.firebasestorage.app",
  messagingSenderId: "216862706013",
  appId: "1:216862706013:web:957d32ad6ea2d30494c0b4",
  measurementId: "G-4DRJZTGYC0",
};

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? defaultFirebaseConfig.apiKey,
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ??
    defaultFirebaseConfig.authDomain,
  projectId:
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ??
    defaultFirebaseConfig.projectId,
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ??
    defaultFirebaseConfig.storageBucket,
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ??
    defaultFirebaseConfig.messagingSenderId,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? defaultFirebaseConfig.appId,
  measurementId:
    process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ??
    defaultFirebaseConfig.measurementId,
};

const requiredConfig = [
  ["NEXT_PUBLIC_FIREBASE_API_KEY", firebaseConfig.apiKey],
  ["NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", firebaseConfig.authDomain],
  ["NEXT_PUBLIC_FIREBASE_PROJECT_ID", firebaseConfig.projectId],
  ["NEXT_PUBLIC_FIREBASE_APP_ID", firebaseConfig.appId],
] as const;

export function getMissingFirebaseConfig() {
  return requiredConfig
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
