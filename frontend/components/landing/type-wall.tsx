const FEED = [
  "/pricing · DE · 204",
  "/docs/quickstart · IN · 204",
  "/ · US · 204",
  "/blog/rollups · BR · 204",
  "/changelog · JP · 204",
  "/docs/events · GB · 204",
  "/docs/reference · NL · 204",
  "/ · KE · 204",
];

const LINES = [
  { words: ["Count"], tone: "solid" },
  { words: ["pages,"], tone: "outline" },
  { words: ["not", "people."], tone: "accent" },
] as const;

// The page's one loud statement. Words fill in as the block scrolls up.
export function TypeWall() {
  let i = 0;
  return (
    <section
      aria-label="Count pages, not people"
      className="relative py-20 md:py-28"
    >
      <h2 className="pa-wall mx-auto max-w-7xl px-5 font-display text-[clamp(64px,15vw,220px)] leading-[0.84] font-bold tracking-[-0.06em] uppercase sm:px-6">
        {LINES.map((line) => (
          <span key={line.words.join(" ")} className="block">
            {line.words.map((w, j) => (
              <span key={w}>
                <span
                  className="pa-wall-word"
                  data-tone={
                    line.tone === "accent" && j === 0 ? "solid" : line.tone
                  }
                  style={{ "--i": i++ } as React.CSSProperties}
                >
                  {w}
                </span>
                {j < line.words.length - 1 && " "}
              </span>
            ))}
          </span>
        ))}
      </h2>
      <div className="pa-marquee relative mt-12 overflow-hidden border-y border-ink/8 py-3.5 md:mt-16">
        <ul
          aria-hidden
          className="pa-marquee-track flex w-max gap-10 font-mono text-[12.5px] whitespace-nowrap text-ink/45"
        >
          {[...FEED, ...FEED].map((e, k) => (
            <li key={k} className="flex items-center gap-3">
              <span className="size-1 rounded-full bg-tangerine" />
              {e}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
