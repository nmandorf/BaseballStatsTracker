"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type firebase from "firebase/compat/app";
import {
  getFirebaseAnalytics,
  getFirebaseAuth,
  isFirebaseConfigured,
} from "@/lib/firebase";

type AuthContextValue = {
  isConfigured: boolean;
  isLoading: boolean;
  user: firebase.User | null;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const isConfigured = isFirebaseConfigured();
  const [user, setUser] = useState<firebase.User | null>(null);
  const [isLoading, setIsLoading] = useState(isConfigured);

  useEffect(() => {
    if (!isConfigured) {
      return;
    }

    const auth = getFirebaseAuth();
    void getFirebaseAnalytics();
    const unsubscribe = auth.onAuthStateChanged((nextUser) => {
      setUser(nextUser);
      setIsLoading(false);
    });

    return unsubscribe;
  }, [isConfigured]);

  const value = useMemo<AuthContextValue>(
    () => ({
      isConfigured,
      isLoading,
      user,
      signOut: async () => {
        if (!isConfigured) {
          return;
        }

        await getFirebaseAuth().signOut();
      },
    }),
    [isConfigured, isLoading, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
