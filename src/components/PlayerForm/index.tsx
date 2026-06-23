import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Save, UserPlus } from "lucide-react";
import {
  createEmptyPlayerInput,
  createZeroPlayerStats,
} from "@/lib/teamStorage";
import { defensivePositions, defensivePositionLabels, normalizeDefensivePosition } from "@/lib/defenseEngine";
import { cn } from "@/lib/utils";
import type { BattingSide, PlayerGender, PlayerProfileInput, SpeedRating, ThrowingSide } from "@/types/player";
import type { DefensiveRatingValue } from "@/types/defense";
import type { PlayerStats } from "@/types/stats";

type PlayerFormProps = {
  seedOrder: number;
  submitLabel: string;
  submitVariant?: "primary" | "secondary";
  variant?: "card" | "plain";
  onSubmit: (input: PlayerProfileInput) => void;
  onCancel?: () => void;
};

const battingSides: BattingSide[] = ["Unknown", "Right", "Left", "Switch"];
const throwingSides: ThrowingSide[] = ["Unknown", "Right", "Left"];
const speedRatings: SpeedRating[] = ["Average", "Fast", "Slow"];
const playerGenders: PlayerGender[] = ["Female", "Male"];
const defensiveRatingValues: DefensiveRatingValue[] = ["Unknown", "Low", "Medium", "High"];

const statFields: Array<{ key: keyof PlayerStats; label: string }> = [
  { key: "gamesPlayed", label: "Games" },
  { key: "plateAppearances", label: "PA" },
  { key: "atBats", label: "AB" },
  { key: "hits", label: "H" },
  { key: "singles", label: "1B" },
  { key: "doubles", label: "2B" },
  { key: "triples", label: "3B" },
  { key: "homeRuns", label: "HR" },
  { key: "walks", label: "BB" },
  { key: "reachedOnError", label: "ROE" },
  { key: "fieldersChoice", label: "FC" },
  { key: "sacFlies", label: "SF" },
  { key: "outs", label: "Outs" },
  { key: "runs", label: "Runs" },
  { key: "rbis", label: "RBI" },
];

const fieldLabelClass = "grid gap-1 text-base font-bold text-foreground sm:text-sm";
const fieldControlClass = "min-h-12 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-base font-semibold outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] sm:min-h-11 sm:text-sm";
const multilineControlClass = "min-h-28 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-3 text-base font-semibold outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] sm:min-h-24 sm:py-2 sm:text-sm";
const secondaryButtonClass = "btn-base btn-secondary min-h-12 px-3 text-base sm:min-h-11 sm:text-sm";
const statLabelClass = "grid min-w-0 gap-1 rounded-lg border border-[var(--border)] bg-[var(--card)] p-2 text-sm font-bold text-[var(--muted-foreground)] sm:text-xs";
const statInputClass = "min-h-11 w-full min-w-0 rounded-md border border-[var(--border)] bg-[var(--background)] px-2 text-center text-base font-bold tabular-nums text-foreground outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] sm:min-h-10 sm:text-sm";
const resetStatsButtonClass = "btn-base btn-secondary min-h-11 px-3 text-sm text-[var(--muted-foreground)] sm:min-h-10 sm:text-xs";
const cancelButtonClass = "btn-base btn-secondary min-h-12 min-w-0 px-3 text-base sm:min-h-11 sm:text-sm";
const submitButtonClass = "btn-base min-h-12 min-w-0 px-3 text-center text-base sm:min-h-11 sm:text-sm";

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
  const primaryPosition = normalizeDefensivePosition(input.primaryPosition);
  const strongestPosition = normalizeDefensivePosition(input.defensiveProfile.notes.bestPosition);
  const avoidPosition = normalizeDefensivePosition(input.defensiveProfile.notes.avoidPosition);
  const backupPosition = normalizeDefensivePosition(input.defensiveProfile.notes.backupPosition);

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
        <label className={fieldLabelClass}>
          Player name
          <input
            className={fieldControlClass}
            onChange={(event) => updateField("name", event.target.value)}
            placeholder="Add player"
            value={input.name}
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className={fieldLabelClass}>
            Gender
            <select
              className={fieldControlClass}
              onChange={(event) => updateField("gender", event.target.value as PlayerGender)}
              value={input.gender}
            >
              <option value="Unknown">Select gender</option>
              {playerGenders.map((gender) => (
                <option key={gender} value={gender}>
                  {gender}
                </option>
              ))}
            </select>
          </label>
          <label className={fieldLabelClass}>
            Speed
            <select
              className={fieldControlClass}
              onChange={(event) => updateField("speedRating", event.target.value as SpeedRating)}
              value={input.speedRating}
            >
              {speedRatings.map((rating) => (
                <option key={rating} value={rating}>
                  {rating}
                </option>
              ))}
            </select>
          </label>
          <label className={fieldLabelClass}>
            Active
            <select
              className={fieldControlClass}
              onChange={(event) => updateField("isActive", event.target.value === "true")}
              value={String(input.isActive)}
            >
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className={fieldLabelClass}>
            Bats
            <select
              className={fieldControlClass}
              onChange={(event) => updateField("bats", event.target.value as BattingSide)}
              value={input.bats}
            >
              {battingSides.map((side) => (
                <option key={side} value={side}>
                  {side}
                </option>
              ))}
            </select>
          </label>
          <label className={fieldLabelClass}>
            Throws
            <select
              className={fieldControlClass}
              onChange={(event) => updateField("throws", event.target.value as ThrowingSide)}
              value={input.throws}
            >
              {throwingSides.map((side) => (
                <option key={side} value={side}>
                  {side}
                </option>
              ))}
            </select>
          </label>
          <label className={fieldLabelClass}>
            Preferred position
            <select
              className={fieldControlClass}
              onChange={(event) => updateField("primaryPosition", event.target.value)}
              value={primaryPosition ?? input.primaryPosition}
            >
              <option value="">No preference</option>
              {input.primaryPosition && !primaryPosition ? (
                <option value={input.primaryPosition}>Current: {input.primaryPosition}</option>
              ) : null}
              {defensivePositions.map((position) => (
                <option key={position} value={position}>{defensivePositionLabels[position]}</option>
              ))}
            </select>
          </label>
        </div>

        <label className={fieldLabelClass}>
          Role
          <input
            className={fieldControlClass}
            onChange={(event) => updateField("roleHint", event.target.value)}
            placeholder="Contact hitter"
            value={input.roleHint}
          />
        </label>

        <label className={fieldLabelClass}>
          Contact notes
          <input
            className={fieldControlClass}
            onChange={(event) => updateField("contactNotes", event.target.value)}
            placeholder="Hits gaps, good runner"
            value={input.contactNotes}
          />
        </label>

        <label className={fieldLabelClass}>
          Experience or profile notes
          <textarea
            className={multilineControlClass}
            onChange={(event) => updateField("notes", event.target.value)}
            placeholder="Played last season, reliable contact, still learning the outfield"
            value={input.notes}
          />
        </label>

        <div className="grid gap-3 rounded-lg bg-[var(--surface)] p-3">
          <div>
            <p className="text-sm font-bold text-foreground">Defensive profile</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-5">
            {[
              ["armStrength", "Arm"],
              ["throwAccuracy", "Accuracy"],
              ["gloveSkill", "Glove"],
              ["range", "Range"],
              ["positionConfidence", "Confidence"],
            ].map(([key, label]) => (
              <label className={fieldLabelClass} key={key}>
                {label}
                <select
                  className={fieldControlClass}
                  onChange={(event) => updateDefensiveRating(key as keyof PlayerProfileInput["defensiveProfile"]["ratings"], event.target.value as DefensiveRatingValue)}
                  value={input.defensiveProfile.ratings[key as keyof PlayerProfileInput["defensiveProfile"]["ratings"]]}
                >
                  {defensiveRatingValues.map((rating) => (
                    <option key={rating} value={rating}>
                      {rating}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className={fieldLabelClass}>
              Strongest position
              <select
                className={fieldControlClass}
                onChange={(event) => updateDefensiveNote("bestPosition", event.target.value)}
                value={strongestPosition ?? input.defensiveProfile.notes.bestPosition}
              >
                <option value="">Not set</option>
                {input.defensiveProfile.notes.bestPosition && !strongestPosition ? (
                  <option value={input.defensiveProfile.notes.bestPosition}>
                    Current: {input.defensiveProfile.notes.bestPosition}
                  </option>
                ) : null}
                {defensivePositions.map((position) => (
                  <option key={position} value={position}>{defensivePositionLabels[position]}</option>
                ))}
              </select>
            </label>
            <label className={fieldLabelClass}>
              Avoid
              <select
                className={fieldControlClass}
                onChange={(event) => updateDefensiveNote("avoidPosition", event.target.value)}
                value={avoidPosition ?? input.defensiveProfile.notes.avoidPosition}
              >
                <option value="">None</option>
                {input.defensiveProfile.notes.avoidPosition && !avoidPosition ? (
                  <option value={input.defensiveProfile.notes.avoidPosition}>
                    Current: {input.defensiveProfile.notes.avoidPosition}
                  </option>
                ) : null}
                {defensivePositions.map((position) => (
                  <option key={position} value={position}>{defensivePositionLabels[position]}</option>
                ))}
              </select>
            </label>
            <label className={fieldLabelClass}>
              Backup
              <select
                className={fieldControlClass}
                onChange={(event) => updateDefensiveNote("backupPosition", event.target.value)}
                value={backupPosition ?? input.defensiveProfile.notes.backupPosition}
              >
                <option value="">Not set</option>
                {input.defensiveProfile.notes.backupPosition && !backupPosition ? (
                  <option value={input.defensiveProfile.notes.backupPosition}>
                    Current: {input.defensiveProfile.notes.backupPosition}
                  </option>
                ) : null}
                {defensivePositions.map((position) => (
                  <option key={position} value={position}>{defensivePositionLabels[position]}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={fieldLabelClass}>
              Strengths
              <input
                className={fieldControlClass}
                onChange={(event) => updateDefensiveNote("strengths", event.target.value)}
                placeholder="Range, strong throws"
                value={input.defensiveProfile.notes.strengths}
              />
            </label>
            <label className={fieldLabelClass}>
              Watch-outs
              <input
                className={fieldControlClass}
                onChange={(event) => updateDefensiveNote("weaknesses", event.target.value)}
                placeholder="Ground balls, sore shoulder"
                value={input.defensiveProfile.notes.weaknesses}
              />
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={fieldLabelClass}>
              Communication
              <input
                className={fieldControlClass}
                onChange={(event) => updateDefensiveNote("communication", event.target.value)}
                placeholder="Calls fly balls clearly"
                value={input.defensiveProfile.notes.communication}
              />
            </label>
            <label className={fieldLabelClass}>
              Health and comfort
              <input
                className={fieldControlClass}
                onChange={(event) => updateDefensiveNote("health", event.target.value)}
                placeholder="Shoulder limits long throws"
                value={input.defensiveProfile.notes.health}
              />
            </label>
          </div>
        </div>

        <button
          className={secondaryButtonClass}
          onClick={() => setShowStats((current) => !current)}
          type="button"
        >
          {showStats ? <ChevronUp className="size-4" aria-hidden="true" /> : <ChevronDown className="size-4" aria-hidden="true" />}
          Starting stats
        </button>

        {showStats ? (
          <div className="grid gap-3 rounded-lg bg-[var(--surface)] p-3">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {statFields.map((field) => (
                <label
                  className={statLabelClass}
                  key={field.key}
                >
                  <span className="min-h-4 truncate text-center leading-4">
                    {field.label}
                  </span>
                  <input
                    className={statInputClass}
                    min={0}
                    onChange={(event) => updateStat(field.key, event.target.value)}
                    type="number"
                    value={input.startingStats[field.key]}
                  />
                </label>
              ))}
            </div>
            <button
              className={resetStatsButtonClass}
              onClick={resetStats}
              type="button"
            >
              Reset stats to zero
            </button>
          </div>
        ) : null}

        <div className={cn("grid gap-2", onCancel ? "sm:grid-cols-2" : "grid-cols-1")}>
          {onCancel ? (
            <button
              className={cancelButtonClass}
              onClick={onCancel}
              type="button"
            >
              Cancel
            </button>
          ) : null}
          <button
            className={cn(submitButtonClass, submitVariant === "primary" ? "btn-primary" : "btn-secondary")}
            disabled={!canSubmit}
            onClick={submit}
            type="button"
          >
            {submitLabel.includes("Save") ? <Save className="size-4" aria-hidden="true" /> : <UserPlus className="size-4" aria-hidden="true" />}
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
