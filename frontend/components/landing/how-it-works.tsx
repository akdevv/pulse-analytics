import { cn } from "@/lib/utils";
import { Reveal, SectionHeading } from "./shared";
import { CodeFrame } from "./code-frame";
import { highlight, type Lang } from "./highlight";
import { dots } from "./surfaces";

type Step = {
  stage: string;
  title: string;
  description: string;
  when: string;
  stack: string[];
  keyLine: string;
  file: string;
  lang: Lang;
  code: string;
};

// Real code from backend/src, trimmed of logging. `[!code highlight]` marks the key line.
const STEPS: Step[] = [
  {
    stage: "Ingest",
    title: "The request does almost nothing.",
    description:
      "Validate, look the site up in a Redis cache, rate-limit per site and per IP, put the event on a BullMQ queue, return 204. Parsing and geo lookups wait for the worker.",
    when: "In the request · 4.8 ms p90",
    stack: ["Express", "Redis", "BullMQ"],
    keyLine: "Enqueue, then answer 204",
    file: "backend/src/modules/ingestion/track.controller.ts",
    lang: "typescript",
    code: `export const track = async (req, res) => {
  const parsed = TrackQuerySchema.safeParse(req.query)
  if (!parsed.success) return res.status(204).send()

  const site = await getCachedSite(parsed.data.tid)
  if (!site) return res.status(204).send()

  const [perSite, perIp] = await Promise.all([
    checkSiteRateLimit(site.id, site.rateLimitTier),
    checkIpRateLimit(extractClientIp(req)),
  ])
  if (!perSite.allowed || !perIp.allowed) return res.status(204).send()

  await enqueue(buildRawEvent(parsed.data, req, site.id)) // [!code highlight]
  res.status(204).send() // always 204, errors never reach the page [!code highlight]
}`,
  },
  {
    stage: "Process",
    title: "A worker writes in batches.",
    description:
      "The worker parses the user agent, looks up the country, then drops the IP. Rows go to the database 100 at a time. If the database is down it holds the batch and retries. A row the database rejects goes to a dead-letter queue, so one bad event can't block the rest.",
    when: "In a worker · within 1 s",
    stack: ["BullMQ worker", "TimescaleDB"],
    keyLine: "One insert per 100 events",
    file: "backend/src/workers/event.worker.ts",
    lang: "typescript",
    code: `const BATCH_SIZE = 100
const FLUSH_INTERVAL_MS = 1000

async function flushBatch() {
  const toFlush = batch
  batch = []

  try {
    await insertManyEvents(toFlush) // [!code highlight]
  } catch (err) {
    if (isPermanentWriteError(err)) {
      await isolateAndQuarantine(toFlush) // bad rows → DLQ
      return
    }
    batch = [...toFlush, ...batch] // transient: keep, retry
    scheduleFlusher()
  }
}`,
  },
  {
    stage: "Query",
    title: "Charts read rollups, not raw events.",
    description:
      "TimescaleDB keeps hourly rollups up to date in the background, so a 30-day chart adds up a few hundred rows instead of scanning every event.",
    when: "When a chart loads",
    stack: ["TimescaleDB", "Next.js"],
    keyLine: "Read the hourly rollup",
    file: "backend/src/modules/analytics/analytics.repository.ts",
    lang: "sql",
    code: `SELECT
  COALESCE(NULLIF(referrer, ''), 'Direct') AS source,
  SUM(pageviews)::int                      AS pageviews
FROM hourly_pageviews -- continuous aggregate [!code highlight]
WHERE "siteId" = $1
  AND bucket >= $2
  AND bucket <  $3
GROUP BY 1
ORDER BY pageviews DESC
LIMIT $4`,
  },
];

const DOTS = dots(
  "radial-gradient(ellipse 70% 60% at 50% 55%, black 30%, transparent 80%)",
  5,
  24
);

function keyLines(code: string) {
  const lines = code
    .split("\n")
    .flatMap((l, i) => (l.includes("[!code highlight]") ? [i + 1] : []));
  return lines.length > 1
    ? `L${lines[0]}–${lines[lines.length - 1]}`
    : `L${lines[0]}`;
}

export async function HowItWorks() {
  const html = await Promise.all(STEPS.map((s) => highlight(s.code, s.lang)));

  return (
    <section
      id="how-it-works"
      className="relative isolate scroll-mt-20 py-24 md:py-32"
    >
      <div aria-hidden className="absolute inset-0 -z-10" style={DOTS} />

      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <SectionHeading
            label="How it works"
            title="Three moving parts."
            muted="One of them is in a hurry."
            lead="The request path only accepts the event. Everything slow happens later, in a worker your visitors never wait on."
          />
        </Reveal>

        <ol className="flex flex-col gap-20 lg:gap-28">
          {STEPS.map((step, i) => (
            <Reveal
              as="li"
              key={step.stage}
              className={cn(
                "grid grid-cols-1 gap-8 lg:items-stretch lg:gap-14",
                i % 2
                  ? "lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]"
                  : "lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]"
              )}
            >
              <StepText
                step={step}
                index={i}
                className={i % 2 ? "lg:order-2" : undefined}
              />
              <CodeFrame file={step.file} lang={step.lang} html={html[i]} />
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

function StepText({
  step,
  index,
  className,
}: {
  step: Step;
  index: number;
  className?: string;
}) {
  const rows = [
    {
      term: "Stage",
      value: (
        <>
          {step.stage}
          <span className="text-ink/30">
            {" "}
            · {index + 1} of {STEPS.length}
          </span>
        </>
      ),
    },
    { term: "Runs", value: step.when },
    { term: "Stack", value: step.stack.join(" · ") },
    {
      term: "Key line",
      value: (
        <>
          <span className="font-mono text-tangerine-soft">
            {keyLines(step.code)}
          </span>
          <span className="text-ink/30"> · </span>
          {step.keyLine}
        </>
      ),
    },
  ];

  return (
    <div
      className={cn("flex flex-col justify-between gap-8 lg:py-2", className)}
    >
      <div>
        <h3 className="font-display text-[28px] leading-[1.1] font-semibold tracking-display text-balance text-ink sm:text-[34px]">
          {step.title}
        </h3>
        <p className="mt-5 max-w-md text-[15px] leading-relaxed text-pretty text-ink/60">
          {step.description}
        </p>
      </div>
      <dl className="border-t border-ink/8 text-[13px]">
        {rows.map(({ term, value }) => (
          <div
            key={term}
            className="grid grid-cols-[6rem_minmax(0,1fr)] gap-4 border-b border-ink/8 py-2.5"
          >
            <dt className="text-ink/40">{term}</dt>
            <dd className="text-ink/75 tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
