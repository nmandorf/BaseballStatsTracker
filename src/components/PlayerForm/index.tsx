import { useMemo, useState } from "react";
import type { ReactNode } from "react";
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

type UpdatePlayerField = <Key extends keyof PlayerProfileInput>(key: Key, value: PlayerProfileInput[Key]) => void;
type UpdateDefensiveRating = (key: keyof PlayerProfileInput["defensiveProfile"]["ratings"], value: DefensiveRatingValue) => void;
type UpdateDefensiveNote = (key: keyof PlayerProfileInput["defensiveProfile"]["notes"], value: string) => void;

function PlayerIdentityFields({
  input,
  onUpdateField,
}: {
  input: PlayerProfileInput;
  onUpdateField: UpdatePlayerField;
}) {
  return (
    <>
      <TextField label="Player name" onChange={(value) => onUpdateField("name", value)} placeholder="Add player" value={input.name} />

      <div className="grid gap-3 sm:grid-cols-3">
        <SelectField label="Gender" onChange={(value) => onUpdateField("gender", value as PlayerGender)} value={input.gender}>
          <option value="Unknown">Select gender</option>
          {playerGenders.map((gender) => <option key={gender} value={gender}>{gender}</option>)}
        </SelectField>
        <SelectField label="Speed" onChange={(value) => onUpdateField("speedRating", value as SpeedRating)} value={input.speedRating}>
          {speedRatings.map((rating) => <option key={rating} value={rating}>{rating}</option>)}
        </SelectField>
        <SelectField label="Active" onChange={(value) => onUpdateField("isActive", value === "true")} value={String(input.isActive)}>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </SelectField>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <SelectField label="Bats" onChange={(value) => onUpdateField("bats", value as BattingSide)} value={input.bats}>
          {battingSides.map((side) => <option key={side} value={side}>{side}</option>)}
        </SelectField>
        <SelectField label="Throws" onChange={(value) => onUpdateField("throws", value as ThrowingSide)} value={input.throws}>
          {throwingSides.map((side) => <option key={side} value={side}>{side}</option>)}
        </SelectField>
        <PositionSelectField
          currentValue={input.primaryPosition}
          emptyLabel="No preference"
          label="Preferred position"
          onChange={(value) => onUpdateField("primaryPosition", value)}
        />
      </div>

      <TextField label="Role" onChange={(value) => onUpdateField("roleHint", value)} placeholder="Contact hitter" value={input.roleHint} />
      <TextField label="Contact notes" onChange={(value) => onUpdateField("contactNotes", value)} placeholder="Hits gaps, good runner" value={input.contactNotes} />

      <label className={fieldLabelClass}>
        Experience or profile notes
        <textarea
          className={multilineControlClass}
          onChange={(event) => onUpdateField("notes", event.target.value)}
          placeholder="Played last season, reliable contact, still learning the outfield"
          value={input.notes}
        />
      </label>
    </>
  );
}

function DefensiveProfileFields({
  input,
  onUpdateDefensiveNote,
  onUpdateDefensiveRating,
}: {
  input: PlayerProfileInput;
  onUpdateDefensiveNote: UpdateDefensiveNote;
  onUpdateDefensiveRating: UpdateDefensiveRating;
}) {
  return (
    <div className="grid gap-3 rounded-lg bg-[var(--surface)] p-3">
      <div>
        <p className="text-sm font-bold text-foreground">Defensive profile</p>
      </div>
      <DefensiveRatingsFields input={input} onUpdateDefensiveRating={onUpdateDefensiveRating} />
      <DefensivePositionFields input={input} onUpdateDefensiveNote={onUpdateDefensiveNote} />
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField label="Strengths" onChange={(value) => onUpdateDefensiveNote("strengths", value)} placeholder="Range, strong throws" value={input.defensiveProfile.notes.strengths} />
        <TextField label="Watch-outs" onChange={(value) => onUpdateDefensiveNote("weaknesses", value)} placeholder="Ground balls, sore shoulder" value={input.defensiveProfile.notes.weaknesses} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField label="Communication" onChange={(value) => onUpdateDefensiveNote("communication", value)} placeholder="Calls fly balls clearly" value={input.defensiveProfile.notes.communication} />
        <TextField label="Health and comfort" onChange={(value) => onUpdateDefensiveNote("health", value)} placeholder="Shoulder limits long throws" value={input.defensiveProfile.notes.health} />
      </div>
    </div>
  );
}

const defensiveRatingFields: Array<{
  key: keyof PlayerProfileInput["defensiveProfile"]["ratings"];
  label: string;
}> = [
  { key: "armStrength", label: "Arm" },
  { key: "throwAccuracy", label: "Accuracy" },
  { key: "gloveSkill", label: "Glove" },
  { key: "range", label: "Range" },
  { key: "positionConfidence", label: "Confidence" },
];

function DefensiveRatingsFields({
  input,
  onUpdateDefensiveRating,
}: {
  input: PlayerProfileInput;
  onUpdateDefensiveRating: UpdateDefensiveRating;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-5">
      {defensiveRatingFields.map((field) => (
        <SelectField
          key={field.key}
          label={field.label}
          onChange={(value) => onUpdateDefensiveRating(field.key, value as DefensiveRatingValue)}
          value={input.defensiveProfile.ratings[field.key]}
        >
          {defensiveRatingValues.map((rating) => <option key={rating} value={rating}>{rating}</option>)}
        </SelectField>
      ))}
    </div>
  );
}

function DefensivePositionFields({
  input,
  onUpdateDefensiveNote,
}: {
  input: PlayerProfileInput;
  onUpdateDefensiveNote: UpdateDefensiveNote;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <PositionSelectField
        currentValue={input.defensiveProfile.notes.bestPosition}
        emptyLabel="Not set"
        label="Strongest position"
        onChange={(value) => onUpdateDefensiveNote("bestPosition", value)}
      />
      <PositionSelectField
        currentValue={input.defensiveProfile.notes.avoidPosition}
        emptyLabel="None"
        label="Avoid"
        onChange={(value) => onUpdateDefensiveNote("avoidPosition", value)}
      />
      <PositionSelectField
        currentValue={input.defensiveProfile.notes.backupPosition}
        emptyLabel="Not set"
        label="Backup"
        onChange={(value) => onUpdateDefensiveNote("backupPosition", value)}
      />
    </div>
  );
}

function StartingStatsFields({
  input,
  onResetStats,
  onToggleStats,
  onUpdateStat,
  showStats,
}: {
  input: PlayerProfileInput;
  onResetStats: () => void;
  onToggleStats: () => void;
  onUpdateStat: (key: keyof PlayerStats, value: string) => void;
  showStats: boolean;
}) {
  return (
    <>
      <button className={secondaryButtonClass} onClick={onToggleStats} type="button">
        {showStats ? <ChevronUp className="size-4" aria-hidden="true" /> : <ChevronDown className="size-4" aria-hidden="true" />}
        Starting stats
      </button>
      {showStats ? <StartingStatsPanel input={input} onResetStats={onResetStats} onUpdateStat={onUpdateStat} /> : null}
    </>
  );
}

function StartingStatsPanel({
  input,
  onResetStats,
  onUpdateStat,
}: {
  input: PlayerProfileInput;
  onResetStats: () => void;
  onUpdateStat: (key: keyof PlayerStats, value: string) => void;
}) {
  return (
    <div className="grid gap-3 rounded-lg bg-[var(--surface)] p-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {statFields.map((field) => (
          <StatInputField field={field} key={field.key} onUpdateStat={onUpdateStat} value={input.startingStats[field.key]} />
        ))}
      </div>
      <button className={resetStatsButtonClass} onClick={onResetStats} type="button">
        Reset stats to zero
      </button>
    </div>
  );
}

function StatInputField({
  field,
  onUpdateStat,
  value,
}: {
  field: (typeof statFields)[number];
  onUpdateStat: (key: keyof PlayerStats, value: string) => void;
  value: number;
}) {
  return (
    <label className={statLabelClass}>
      <span className="min-h-4 truncate text-center leading-4">
        {field.label}
      </span>
      <input
        className={statInputClass}
        min={0}
        onChange={(event) => onUpdateStat(field.key, event.target.value)}
        type="number"
        value={value}
      />
    </label>
  );
}

function PlayerFormActions({
  canSubmit,
  onCancel,
  onSubmit,
  submitLabel,
  submitVariant,
}: {
  canSubmit: boolean;
  onCancel?: () => void;
  onSubmit: () => void;
  submitLabel: string;
  submitVariant: "primary" | "secondary";
}) {
  return (
    <div className={cn("grid gap-2", onCancel ? "sm:grid-cols-2" : "grid-cols-1")}>
      {onCancel ? <CancelButton onCancel={onCancel} /> : null}
      <SubmitPlayerButton canSubmit={canSubmit} onSubmit={onSubmit} submitLabel={submitLabel} submitVariant={submitVariant} />
    </div>
  );
}

function CancelButton({ onCancel }: { onCancel: () => void }) {
  return (
    <button className={cancelButtonClass} onClick={onCancel} type="button">
      Cancel
    </button>
  );
}

function SubmitPlayerButton({
  canSubmit,
  onSubmit,
  submitLabel,
  submitVariant,
}: {
  canSubmit: boolean;
  onSubmit: () => void;
  submitLabel: string;
  submitVariant: "primary" | "secondary";
}) {
  const Icon = submitLabel.includes("Save") ? Save : UserPlus;

  return (
    <button
      className={cn(submitButtonClass, submitVariant === "primary" ? "btn-primary" : "btn-secondary")}
      disabled={!canSubmit}
      onClick={onSubmit}
      type="button"
    >
      <Icon className="size-4" aria-hidden="true" />
      {submitLabel}
    </button>
  );
}

function TextField({
  label,
  onChange,
  placeholder,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <label className={fieldLabelClass}>
      {label}
      <input className={fieldControlClass} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} value={value} />
    </label>
  );
}

function SelectField({
  children,
  label,
  onChange,
  value,
}: {
  children: ReactNode;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className={fieldLabelClass}>
      {label}
      <select className={fieldControlClass} onChange={(event) => onChange(event.target.value)} value={value}>
        {children}
      </select>
    </label>
  );
}

function PositionSelectField({
  currentValue,
  emptyLabel,
  label,
  onChange,
}: {
  currentValue: string;
  emptyLabel: string;
  label: string;
  onChange: (value: string) => void;
}) {
  const normalizedPosition = normalizeDefensivePosition(currentValue);

  return (
    <SelectField label={label} onChange={onChange} value={normalizedPosition ?? currentValue}>
      <option value="">{emptyLabel}</option>
      <UnknownPositionOption currentValue={currentValue} normalizedPosition={normalizedPosition} />
      {defensivePositions.map((position) => (
        <option key={position} value={position}>{defensivePositionLabels[position]}</option>
      ))}
    </SelectField>
  );
}

function UnknownPositionOption({
  currentValue,
  normalizedPosition,
}: {
  currentValue: string;
  normalizedPosition: ReturnType<typeof normalizeDefensivePosition>;
}) {
  return currentValue && !normalizedPosition
    ? <option value={currentValue}>Current: {currentValue}</option>
    : null;
}
