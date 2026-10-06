"use client";

export type Preset = "7d" | "30d" | "90d";
export type Interval = "day" | "hour";

interface Props {
  preset: Preset;
  interval: Interval;
  onPresetChange: (p: Preset) => void;
  onIntervalChange: (i: Interval) => void;
}

const PRESETS: { value: Preset; label: string }[] = [
  { value: "7d", label: "7D" },
  { value: "30d", label: "30D" },
  { value: "90d", label: "90D" },
];

const INTERVALS: { value: Interval; label: string }[] = [
  { value: "hour", label: "Hourly" },
  { value: "day", label: "Daily" },
];

/** One group, one selected item, filled in the accent. Two identical outlined
    pill groups side by side gave the range and the bucket the same weight,
    which they do not have — the bucket only ever refines the range. */
function Group<T extends string>({
  label,
  options,
  value,
  onChange,
  fill,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  fill: boolean;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex shrink-0 items-center gap-0.5 rounded-lg border border-[var(--seam)] p-0.5"
    >
      {options.map((option) => {
        const on = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(option.value)}
            className={`cursor-pointer rounded-md px-2.5 py-1 font-mono text-[10px] font-semibold tracking-[0.08em] uppercase transition-colors duration-150 ease-[var(--ease-out)] ${
              on
                ? fill
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground"
                : "text-foreground/45 hover:bg-foreground/[0.05] hover:text-foreground/90"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function DateRangeBar({
  preset,
  interval,
  onPresetChange,
  onIntervalChange,
}: Props) {
  return (
    <div className="flex items-center gap-2">
      <Group
        label="Date range"
        options={PRESETS}
        value={preset}
        onChange={onPresetChange}
        fill
      />
      <Group
        label="Bucket size"
        options={INTERVALS}
        value={interval}
        onChange={onIntervalChange}
        fill={false}
      />
    </div>
  );
}
