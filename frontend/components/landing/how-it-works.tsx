import { ACCENT, DISPLAY, POWDER } from "./tokens";
import { Reveal, SectionHeading } from "./shared";
import { highlight, type Lang } from "./highlight";

const STEPS: {
  n: string;
  eyebrow: string;
  title: string;
  description: string;
  file: string;
  lang: Lang;
  code: string;
}[] = [
  {
    n: "01",
    eyebrow: "Ingest",
    title: "Fire and forget at the edge.",
    description:
      "Dockerized Express on AWS. Tracking ID resolves via Redis in under a millisecond. Server returns 204 No Content, then drops the payload on the queue. Client never waits on processing.",
    file: "server/collect.ts",
    lang: "typescript",
    code: `app.post('/collect', async (req, res) => {
  const siteId = await redis.get(
    \`tk:\${req.headers['x-pulse-key']}\`
  )
  if (!siteId) return res.sendStatus(404)

  // fire-and-forget
  res.sendStatus(204)
  queue.publish('events.raw', {
    siteId,
    ts: Date.now(),
    ...req.body,
  })
})`,
  },
  {
    n: "02",
    eyebrow: "Process",
    title: "RabbitMQ absorbs the spikes.",
    description:
      "Workers pull batches off the queue, validate, enrich with geo and UA data, and insert in bulk. When traffic spikes, the queue grows. No timeouts, no data loss — just backpressure that resolves itself.",
    file: "workers/process.ts",
    lang: "typescript",
    code: `consumer.on('events.raw', async (batch) => {
  const rows = batch
    .map(enrich)     // geo, UA, referrer
    .filter(valid)   // drop malformed

  await timescale.insertMany('events', rows)

  // ack only after successful persist
  batch.ack()
})`,
  },
  {
    n: "03",
    eyebrow: "Query",
    title: "TimescaleDB answers instantly.",
    description:
      "Continuous aggregates pre-compute 1-minute, 1-hour, and 1-day rollups. Dashboards query the summary, not the raw events. Sub-second, no matter how deep the history.",
    file: "db/queries.sql",
    lang: "sql",
    code: `-- served from a continuous aggregate
SELECT time_bucket('1 hour', ts) AS hour,
       COUNT(*) AS views,
       COUNT(DISTINCT user_id) AS uniques
  FROM events_1h
 WHERE site_id = $1
   AND ts > now() - interval '7 days'
 GROUP BY hour
 ORDER BY hour;`,
  },
];

const LANG_LABEL: Record<Lang, string> = {
  typescript: "ts",
  sql: "sql",
  html: "html",
};

async function CodePanel({
  file,
  lang,
  code,
}: {
  file: string;
  lang: Lang;
  code: string;
}) {
  const html = await highlight(code, lang);
  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-ink/8"
      style={{
        background: "oklch(0.1560 0 0)",
        boxShadow:
          "0 0 0 1px rgba(229,227,210,0.03), 0 40px 80px -20px rgba(0,0,0,0.75), 0 0 60px oklch(0.6832 0.2107 38.6427 / 0.06)",
      }}
    >
      {/* accent hairline top */}
      <div
        aria-hidden
        className="absolute inset-x-0 -top-px h-px"
        style={{
          background: `linear-gradient(90deg, transparent 10%, ${ACCENT} 50%, transparent 90%)`,
          opacity: 0.45,
        }}
      />

      {/* title bar */}
      <div
        className="relative flex items-center border-b border-ink/6 px-4 py-3"
        style={{ background: "oklch(0.1750 0 0)" }}
      >
        {/* traffic lights */}
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-ink/15" />
          <span className="h-3 w-3 rounded-full bg-ink/15" />
          <span className="h-3 w-3 rounded-full bg-ink/15" />
        </div>

        {/* centered filename */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="flex items-center gap-1.5 font-mono text-[12px] text-ink/55">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              className="text-ink/60"
            >
              <path
                strokeLinecap="round"
                d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"
              />
              <polyline strokeLinecap="round" points="13 2 13 9 20 9" />
            </svg>
            {file}
          </span>
        </div>

        {/* lang badge right */}
        <span
          className="ml-auto rounded px-2 py-0.5 font-mono text-[10px] tracking-[0.18em] uppercase"
          style={{
            background: "color-mix(in oklab, " + POWDER + " 12%, transparent)",
            color: POWDER,
          }}
        >
          {LANG_LABEL[lang]}
        </span>
      </div>

      {/* code */}
      <div
        className="code-panel-body overflow-x-auto p-6 [&>pre]:bg-transparent! [&>pre]:p-0! [&>pre]:font-mono [&>pre]:text-[12.5px] [&>pre]:leading-[1.8]"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="pa-alt relative overflow-hidden py-28 md:py-40"
    >
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, #E5E3D2 1px, transparent 0)`,
          backgroundSize: "32px 32px",
          maskImage:
            "radial-gradient(ellipse 60% 50% at 50% 50%, black 30%, transparent 80%)",
        }}
      />

      <div className="relative mx-auto max-w-6xl px-6">
        <Reveal className="mb-28 flex max-w-3xl flex-col items-start gap-6">
          <SectionHeading
            line1="The pipeline, roughly"
            line2="three moving parts."
          />
          <p className="max-w-lg text-[15px] leading-relaxed text-ink/60">
            Collect hot, process async, persist for time. Every piece picked
            because it refuses to blink under load.
          </p>
        </Reveal>

        <div className="flex flex-col gap-28">
          {STEPS.map((step, i) => {
            const reversed = i % 2 === 1;
            return (
              <Reveal
                key={step.n}
                className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16"
              >
                <div
                  className={`flex flex-col gap-5 ${
                    reversed ? "lg:order-2" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="rounded px-2 py-0.5 font-mono text-[11px] text-charcoal tabular-nums"
                      style={{ background: ACCENT }}
                    >
                      {step.n}
                    </span>
                    <span className="font-mono text-[11px] tracking-[0.22em] text-ink/60 uppercase">
                      {step.eyebrow}
                    </span>
                  </div>
                  <h3
                    className="text-[32px] leading-[1.05] tracking-[-0.02em] text-ink md:text-[40px]"
                    style={DISPLAY}
                  >
                    {step.title}
                  </h3>
                  <p className="max-w-md text-[15px] leading-relaxed text-ink/55">
                    {step.description}
                  </p>
                </div>
                <div className={reversed ? "lg:order-1" : ""}>
                  <CodePanel
                    file={step.file}
                    lang={step.lang}
                    code={step.code}
                  />
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
