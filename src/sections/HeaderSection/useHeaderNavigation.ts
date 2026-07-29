import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getLiveGameHref } from "@/lib/gameEngine";
import { useFirstGameState } from "@/lib/useFirstGameState";
import type { AppNavKey } from "./HeaderNavigation";

const liveGamePaths = new Set(["/stats-entry", "/defense"]);

export function useHeaderNavigation(activeNav: AppNavKey | null) {
  const activeMobileNavItemRef = useRef<HTMLAnchorElement>(null);
  const gameState = useFirstGameState();
  const pathname = usePathname();
  const router = useRouter();
  const isLiveGame = gameState.status === "IN_PROGRESS";

  useEffect(() => {
    if (!shouldStayOnCurrentLiveGamePath(isLiveGame, pathname)) {
      router.replace(getLiveGameHref(gameState));
    }
  }, [gameState, isLiveGame, pathname, router]);

  useEffect(() => {
    if (!isLiveGame) {
      activeMobileNavItemRef.current?.scrollIntoView({
        block: "nearest",
        inline: "nearest",
      });
    }
  }, [activeNav, isLiveGame]);

  return {
    activeMobileNavItemRef,
    isLiveGame,
  };
}

function shouldStayOnCurrentLiveGamePath(
  isLiveGame: boolean,
  pathname: string | null,
) {
  return !isLiveGame || Boolean(pathname && liveGamePaths.has(pathname));
}
