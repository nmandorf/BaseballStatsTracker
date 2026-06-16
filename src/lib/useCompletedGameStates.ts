"use client";

import { useSyncExternalStore } from "react";
import {
  getCompletedGameStatesServerSnapshot,
  loadCompletedGameStates,
  subscribeCompletedGameStates,
} from "@/lib/firstGameStorage";

export function useCompletedGameStates() {
  return useSyncExternalStore(
    subscribeCompletedGameStates,
    loadCompletedGameStates,
    getCompletedGameStatesServerSnapshot,
  );
}
