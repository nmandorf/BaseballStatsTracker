"use client";

import { useEffect, useSyncExternalStore } from "react";
import {
  getFirstGameServerSnapshot,
  hydrateFirstGameStateFromPrisma,
  loadFirstGameState,
  subscribeFirstGameState,
} from "@/lib/firstGameStorage";

export function useFirstGameState() {
  const state = useSyncExternalStore(
    subscribeFirstGameState,
    loadFirstGameState,
    getFirstGameServerSnapshot,
  );

  useEffect(() => {
    hydrateFirstGameStateFromPrisma();
  }, []);

  return state;
}
