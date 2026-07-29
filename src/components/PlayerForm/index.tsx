import { useMemo, useState } from "react";
import {
  createEmptyPlayerInput,
  createZeroPlayerStats,
} from "@/lib/teamStorage";
import { cn } from "@/lib/utils";
import type { PlayerProfileInput } from "@/types/player";
import type { DefensiveRatingValue } from "@/types/defense";
import type { PlayerStats } from "@/types/stats";
import {
  DefensiveProfileFields,
  PlayerFormActions,
  PlayerIdentityFields,
  StartingStatsFields,
} from "./PlayerFormFields";

type PlayerFormProps = {
  seedOrder: number;
  submitLabel: string;
  submitVariant?: "primary" | "secondary";
  variant?: "card" | "plain";
  onSubmit: (input: PlayerProfileInput) => void;
  onCancel?: () => void;
};

export function PlayerForm({
  seedOrder,
  submitLabel,
  submitVariant = "primary",
  variant = "card",
  onSubmit,
  onCancel,
}: PlayerFormProps) {
  const initialInput = useMemo(() => createEmptyPlayerInput(seedOrder), [seedOrder]);
  const [input, setInput] = useState<PlayerProfileInput>(initialInput);
  const [showStats, setShowStats] = useState(false);
  const canSubmit = Boolean(input.name.trim() && input.gender !== "Unknown");

  function updateField<Key extends keyof PlayerProfileInput>(key: Key, value: PlayerProfileInput[Key]) {
    setInput((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function updateStat(key: keyof PlayerStats, value: string) {
    setInput((current) => ({
      ...current,
      startingStats: {
        ...current.startingStats,
        [key]: Math.max(0, Number.parseInt(value || "0", 10) || 0),
      },
    }));
  }

  function resetStats() {
    updateField("startingStats", createZeroPlayerStats());
  }

  function updateDefensiveRating(key: keyof PlayerProfileInput["defensiveProfile"]["ratings"], value: DefensiveRatingValue) {
    setInput((current) => ({
      ...current,
      defensiveProfile: {
        ...current.defensiveProfile,
        ratings: {
          ...current.defensiveProfile.ratings,
          [key]: value,
        },
      },
    }));
  }

  function updateDefensiveNote(key: keyof PlayerProfileInput["defensiveProfile"]["notes"], value: string) {
    setInput((current) => ({
      ...current,
      defensiveProfile: {
        ...current.defensiveProfile,
        notes: {
          ...current.defensiveProfile.notes,
          [key]: value,
        },
      },
    }));
  }

  function submit() {
    if (!canSubmit) {
      return;
    }

    onSubmit(input);
    setInput(createEmptyPlayerInput(seedOrder + 1));
    setShowStats(false);
  }

  return (
    <div
      className={cn(
        variant === "card"
          ? "rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm shadow-foreground/[0.035]"
          : "bg-[var(--card)]",
      )}
    >
      <div className="grid gap-3">
        <PlayerIdentityFields input={input} onUpdateField={updateField} />
        <DefensiveProfileFields input={input} onUpdateDefensiveNote={updateDefensiveNote} onUpdateDefensiveRating={updateDefensiveRating} />
        <StartingStatsFields
          input={input}
          onResetStats={resetStats}
          onToggleStats={() => setShowStats((current) => !current)}
          onUpdateStat={updateStat}
          showStats={showStats}
        />
        <PlayerFormActions
          canSubmit={canSubmit}
          onCancel={onCancel}
          onSubmit={submit}
          submitLabel={submitLabel}
          submitVariant={submitVariant}
        />
      </div>
    </div>
  );
}
