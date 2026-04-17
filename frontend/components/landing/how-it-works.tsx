import { DISPLAY, SectionEyebrow, SectionHeading } from "./shared";

const STEPS = [
  {
    n: "01",
    title: "Edge ingestion",
    description:
      "Dockerized Express on AWS. Resolves tracking ID via Redis, returns 204 instantly, drops the payload on the queue. No waiting.",
    lang: "ts",
    code: `app.post('/collect', async (req, res) => {
  const siteId = await redis.get(\`tk:\${req.headers.key}\`)
  if (!siteId) return res.sendStatus(404)
  res.sendStatus(204) // fire and forget
  queue.publish('events.raw', { siteId, ...req.body })
})`,
  },
  {
    n: "02",
    title: "Async processing",
    description:
      "RabbitMQ absorbs spikes. Workers validate, enrich, and batch-insert. Back-pressure instead of data loss when traffic goes nuclear.",
    lang: "ts",
    code: `consumer.on('events.raw', async (batch) => {
  const rows = batch
    .map(enrich)
    .filter(valid)
  await timescale.insertMany('events', rows)
  // ack only after persist
  batch.ack()
})`,
  },
  {
    n: "03",
    title: "Time-series reads",
    description:
      "TimescaleDB hyper-tables + continuous aggregates. Dashboards read pre-computed buckets instead of scanning raw events. Sub-second, regardless of depth.",
    lang: "sql",
    code: `SELECT time_bucket('1 hour', ts) AS h,
       COUNT(*) AS views
  FROM events_1h -- continuous aggregate
 WHERE site_id = $1
   AND ts > now() - interval '7 days'
 GROUP BY h;`,
  },
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="relative py-40 bg-black overflow-hidden"
    >
      <div className="relative mx-auto max-w-6xl px-6">
        <div className="flex flex-col items-start gap-6 mb-24 max-w-3xl">
          <SectionEyebrow>Architecture</SectionEyebrow>
          <SectionHeading
            line1="The pipeline, roughly"
            line2="three moving parts."
          />
          <p className="text-[15px] text-white/50 leading-relaxed max-w-lg">
            Collect hot, process async, persist for time. Every piece picked
            because it refuses to blink under load.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-px rounded-2xl overflow-hidden border border-white/6 bg-white/6">
          {STEPS.map((step) => (
            <div
              key={step.n}
              className="group flex flex-col p-8 transition-colors duration-300 hover:bg-white/5"
              style={{ background: "oklch(0.14 0.004 285)" }}
            >
              <div className="flex items-center justify-between mb-10">
                <span className="font-mono text-[11px] tabular-nums text-white/40">
                  {step.n}
                </span>
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/30">
                  {step.lang}
                </span>
              </div>

              <h3
                className="text-xl font-medium text-white mb-3 tracking-tight"
                style={DISPLAY}
              >
                {step.title}
              </h3>
              <p className="text-[14px] text-white/50 leading-relaxed mb-8">
                {step.description}
              </p>

              <div
                className="mt-auto rounded-lg border border-white/6 p-4"
                style={{ background: "oklch(0.11 0.003 285)" }}
              >
                <pre className="text-[12px] font-mono text-white/75 leading-[1.7] overflow-x-auto">
                  <code>{step.code}</code>
                </pre>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
