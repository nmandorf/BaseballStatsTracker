"use client";

import {
  DesktopPrimaryNav,
  HeaderActions,
  HeaderBrand,
  MobilePrimaryNav,
  type AppNavKey,
} from "./HeaderNavigation";
import { useHeaderNavigation } from "./useHeaderNavigation";

export type { AppNavKey } from "./HeaderNavigation";

type HeaderSectionProps = {
  activeNav?: AppNavKey | null;
};

export function HeaderSection({ activeNav = "home" }: HeaderSectionProps) {
  const { activeMobileNavItemRef, isLiveGame } =
    useHeaderNavigation(activeNav);

  return (
    <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-background/94 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8 xl:grid xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
        <HeaderBrand />
        <DesktopPrimaryNav activeNav={activeNav} isLiveGame={isLiveGame} />
        <HeaderActions isLiveGame={isLiveGame} />
      </div>
      <MobilePrimaryNav
        activeMobileNavItemRef={activeMobileNavItemRef}
        activeNav={activeNav}
        isLiveGame={isLiveGame}
      />
    </header>
  );
}
