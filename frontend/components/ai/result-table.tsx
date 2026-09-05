"use client";

// Rendering is capped well below the runner's 1000-row limit. Past a couple of
// hundred rows nobody is reading, and the DOM cost is real on a slow machine.
const RENDER_CAP = 200;

// Counts arrive as strings — Postgres bigint does not fit in a JS number, so pg
// hands them over as text. Format what looks numeric, print the rest as is.
const isNumeric = (v: unknown) =>
  typeof v === "number" ||
  (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v)));

const isIsoDate = (v: unknown): v is string =>
  typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v);

const format = (v: unknown): string => {
  if (v === null || v === undefined || v === "") return "—";
  if (isNumeric(v)) return Number(v).toLocaleString();
  if (isIsoDate(v)) {
    return new Date(v).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }
  return String(v);
};

export function ResultTable({
  rows,
  caption,
}: {
  rows: Record<string, unknown>[];
  caption: string;
}) {
  if (!rows.length) {
    return (
      <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
        The query ran and matched nothing.
      </p>
    );
  }

  const columns = Object.keys(rows[0]!);
  const visible = rows.slice(0, RENDER_CAP);

  return (
    <div>
      <div className="max-h-[26rem] overflow-auto rounded-lg border border-border [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar]:size-2">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead className="sticky top-0 z-10">
            <tr>
              {columns.map((c) => {
                const numeric = isNumeric(rows[0]![c]);
                return (
                  <th
                    key={c}
                    scope="col"
                    className={`border-b border-border bg-muted/70 px-3 py-2.5 font-mono text-[10px] font-semibold tracking-[0.14em] whitespace-nowrap text-muted-foreground uppercase backdrop-blur-sm ${
                      numeric ? "text-right" : "text-left"
                    }`}
                  >
                    {c}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {visible.map((row, i) => (
              <tr
                key={i}
                className="border-b border-border/50 transition-colors last:border-0 hover:bg-accent/40"
              >
                {columns.map((c) => (
                  <td
                    key={c}
                    title={String(row[c] ?? "")}
                    className={`max-w-[22rem] truncate px-3 py-2 ${
                      isNumeric(row[c])
                        ? "text-right font-mono tabular-nums"
                        : "text-left"
                    }`}
                  >
                    {format(row[c])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length > RENDER_CAP && (
        <p className="mt-2 font-mono text-[11px] text-muted-foreground">
          showing first {RENDER_CAP} of {rows.length.toLocaleString()} rows
        </p>
      )}
    </div>
  );
}
