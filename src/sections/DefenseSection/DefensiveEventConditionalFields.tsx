import type {
  DefensiveEventType,
  GreatPlayImpact,
  MisplayResult,
  MisplayType,
} from "@/types/defense";

const misplayTypes: MisplayType[] = [
  "Fielding mistake",
  "Throwing mistake",
  "Catching mistake",
  "Missed fly ball",
  "Bad decision",
  "Did not cover base",
  "Did not back up play",
];
const misplayResults: MisplayResult[] = [
  "Batter reached base",
  "Runner advanced",
  "Run scored",
  "Extra base allowed",
  "Out missed",
];
const greatPlayImpacts: GreatPlayImpact[] = [
  "Saved an out",
  "Saved a run",
  "Prevented extra base",
  "Ended inning",
  "Double play started",
];

const selectClass =
  "min-h-11 w-full min-w-0 max-w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm font-bold text-foreground outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]";

export function MisplayFields({
  eventType,
  misplayResult,
  misplayType,
  onChangeResult,
  onChangeType,
}: {
  eventType: DefensiveEventType;
  misplayResult: MisplayResult | "";
  misplayType: MisplayType | "";
  onChangeResult: (nextMisplayResult: MisplayResult | "") => void;
  onChangeType: (nextMisplayType: MisplayType | "") => void;
}) {
  if (eventType !== "MISPLAY") {
    return null;
  }

  return (
    <div className="grid min-w-0 gap-3 sm:grid-cols-2">
      <label className="grid min-w-0 gap-1 text-sm font-bold text-foreground">
        Misplay type
        <select
          className={selectClass}
          onChange={(event) =>
            onChangeType(event.target.value as MisplayType | "")
          }
          value={misplayType}
        >
          <option value="">Not recorded</option>
          {misplayTypes.map((misplayTypeOption) => (
            <option key={misplayTypeOption} value={misplayTypeOption}>
              {misplayTypeOption}
            </option>
          ))}
        </select>
      </label>
      <label className="grid min-w-0 gap-1 text-sm font-bold text-foreground">
        Result
        <select
          className={selectClass}
          onChange={(event) =>
            onChangeResult(event.target.value as MisplayResult | "")
          }
          value={misplayResult}
        >
          <option value="">Not recorded</option>
          {misplayResults.map((misplayResultOption) => (
            <option key={misplayResultOption} value={misplayResultOption}>
              {misplayResultOption}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

export function GreatPlayImpactField({
  eventType,
  greatPlayImpact,
  onChange,
}: {
  eventType: DefensiveEventType;
  greatPlayImpact: GreatPlayImpact | "";
  onChange: (nextGreatPlayImpact: GreatPlayImpact | "") => void;
}) {
  if (eventType !== "GREAT_PLAY") {
    return null;
  }

  return (
    <label className="grid min-w-0 gap-1 text-sm font-bold text-foreground">
      Impact
      <select
        className={selectClass}
        onChange={(event) =>
          onChange(event.target.value as GreatPlayImpact | "")
        }
        value={greatPlayImpact}
      >
        <option value="">Not recorded</option>
        {greatPlayImpacts.map((greatPlayImpactOption) => (
          <option key={greatPlayImpactOption} value={greatPlayImpactOption}>
            {greatPlayImpactOption}
          </option>
        ))}
      </select>
    </label>
  );
}
