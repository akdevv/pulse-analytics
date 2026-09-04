"use client";

export type Preset = "7d" | "30d" | "90d";
export type Interval = "day" | "hour";

interface Props {
  preset: Preset;
  interval: Interval;
  onPresetChange: (p: Preset) => void;
  onIntervalChange: (i: Interval) => void;
}

export function DateRangeBar({
  preset,
  interval,
  onPresetChange,
  onIntervalChange,
}: Props) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-0.5 rounded-lg border border-border bg-card p-0.5">
        {(["7d", "30d", "90d"] as Preset[]).map((p) => (
          <button
            key={p}
            onClick={() => onPresetChange(p)}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all duration-150 ${
              preset === p
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
            }`}
          >
            {p === "7d" ? "7D" : p === "30d" ? "30D" : "90D"}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-0.5 rounded-lg border border-border bg-card p-0.5">
        {(["day", "hour"] as Interval[]).map((i) => (
          <button
            key={i}
            onClick={() => onIntervalChange(i)}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all duration-150 ${
              interval === i
                ? "bg-accent text-foreground shadow-sm"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
            }`}
          >
            {i === "day" ? "Daily" : "Hourly"}
          </button>
        ))}
      </div>
    </div>
  );
}
