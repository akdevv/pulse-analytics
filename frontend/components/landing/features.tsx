import { cn } from "@/lib/utils";
import { highlight } from "./highlight";
import { Reveal, SectionHeading } from "./shared";
import { STAGE } from "./surfaces";
import { AskTile, ClickTile, LiveTile, WELL } from "./features-live";
import { CountUp, Spotlight } from "./motion";

// Output of backend/src/modules/ai/sql.prompt.md for this question.
const ASK_SQL = `SELECT country, SUM(pageviews)
FROM ask_daily
WHERE "deviceType" = 'mobile'
  AND bucket >= now() - '7 days'
GROUP BY 1 ORDER BY 2 DESC`;

const ASK_ROWS = [
  { country: "IN", pageviews: "1,284" },
  { country: "US", pageviews: "962" },
  { country: "DE", pageviews: "411" },
];

const EVENT_HTML = `<button data-pulse-event="signup">
  Sign up
</button>`;

const REACT_HOOK = `usePulse({ siteId })
// route changes are tracked`;

const NUMBERS = [
  { value: 0, suffix: "", label: "Cookies set" },
  { value: 204, suffix: "", label: "Every ingest reply" },
  { value: 100, suffix: "", label: "Rows per insert" },
  { value: 10, suffix: "k/s", label: "Target, load test pending" },
];

export async function Features() {
  const [sql, eventHtml, reactHook] = await Promise.all([
    highlight(ASK_SQL, "sql"),
    highlight(EVENT_HTML, "html"),
    highlight(REACT_HOOK, "tsx"),
  ]);

  return (
    <section id="features" className="relative scroll-mt-20 py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <SectionHeading
            label="Features"
            title="Everything you need."
            muted="Nothing that follows people around."
            lead="Pageviews, referrers, devices, countries, custom events, and a box that answers questions about your traffic in plain English."
          />
        </Reveal>

        <Reveal
          delay={80}
          className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:auto-rows-68 lg:grid-cols-4 lg:gap-4"
        >
          <Tile
            title="Ask your data a question."
            description="The model writes the SQL, never runs it. A parser checks it's one read-only SELECT scoped to your site."
            className="md:col-span-2 lg:row-span-2"
            visual={
              <AskTile
                question="Which countries sent the most mobile traffic this week?"
                sql={<Snippet html={sql} />}
                table={
                  <table
                    className={cn(
                      WELL,
                      "w-full border-separate border-spacing-0 font-mono text-[12px]"
                    )}
                  >
                    <thead>
                      <tr className="text-left text-[11px] text-ink/40">
                        <th className="border-b border-ink/8 px-4 py-2 font-normal">
                          country
                        </th>
                        <th className="border-b border-ink/8 px-4 py-2 text-right font-normal">
                          pageviews
                        </th>
                      </tr>
                    </thead>
                    <tbody className="text-ink/75 tabular-nums">
                      {ASK_ROWS.map((r) => (
                        <tr key={r.country}>
                          <td className="px-4 py-1.5">{r.country}</td>
                          <td className="px-4 py-1.5 text-right">
                            {r.pageviews}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                }
                answer={
                  <>
                    India sent the most, {ASK_ROWS[0].pageviews} pageviews, then
                    the US and Germany.
                  </>
                }
              />
            }
          />

          <Tile
            title="Who's on the site right now."
            description="A live count and event feed, streamed over server-sent events."
            className="md:col-span-2"
            visual={<LiveTile />}
          />

          <Tile
            title="No cookies, no stored IPs."
            description="The IP is used once for the country, then dropped."
            visual={
              <div className="flex h-full items-center p-6 pb-2">
                <div
                  className={cn(
                    WELL,
                    "w-full px-4 py-3 font-mono text-[13px] leading-[1.9]"
                  )}
                >
                  <div className="text-ink/75">
                    <span className="text-ink/30">&gt; </span>document.cookie
                  </div>
                  <div className="text-powder">
                    <span className="text-ink/30">&lt; </span>&quot;&quot;
                  </div>
                </div>
              </div>
            }
          />

          <Tile
            title="Built for single-page apps."
            description="A React hook. Route changes count as pageviews."
            visual={
              <div className="flex h-full items-end pt-6 pl-6">
                <Snippet
                  html={reactHook}
                  className="w-full rounded-r-none rounded-b-none"
                />
              </div>
            }
          />

          <Tile
            title="Track clicks with one attribute."
            description="Add data-pulse-event to any element, or call trackEvent."
            className="md:col-span-2"
            visual={<ClickTile snippet={<Snippet html={eventHtml} />} />}
          />

          <Tile
            title="By the numbers."
            description="10k/s is the design target until the load test runs."
            className="md:col-span-2"
            visual={
              <dl className="grid h-full grid-cols-2 content-center gap-x-6 gap-y-5 p-6 pb-2 sm:grid-cols-4 lg:grid-cols-2">
                {NUMBERS.map(({ value, suffix, label }) => (
                  <div key={label} className="flex flex-col gap-1.5">
                    <dt className="order-2 text-[12.5px] leading-snug text-ink/45">
                      {label}
                    </dt>
                    <dd className="order-1 font-display text-[34px] leading-none font-semibold tracking-[-0.03em] text-ink tabular-nums">
                      <CountUp to={value} />
                      {suffix}
                    </dd>
                  </div>
                ))}
              </dl>
            }
          />
        </Reveal>
      </div>
    </section>
  );
}

function Tile({
  title,
  description,
  visual,
  className,
}: {
  title: string;
  description: string;
  visual: React.ReactNode;
  className?: string;
}) {
  return (
    <Spotlight
      className={cn(
        "flex min-h-64 flex-col overflow-hidden rounded-2xl border border-ink/8 bg-surface-1 transition-[border-color,transform] duration-300 ease-out hover:-translate-y-0.5 hover:border-ink/14",
        className
      )}
    >
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <div aria-hidden className="absolute inset-0" style={STAGE} />
        <div className="relative h-full">{visual}</div>
      </div>
      <div className="relative px-6 pt-4 pb-6">
        <h3 className="font-display text-[17px] leading-snug font-semibold tracking-display text-ink">
          {title}
        </h3>
        <p className="mt-1 text-[14px] leading-relaxed text-pretty text-ink/50">
          {description}
        </p>
      </div>
    </Spotlight>
  );
}

function Snippet({ html, className }: { html: string; className?: string }) {
  return (
    <div
      className={cn(
        WELL,
        "pa-code pa-code-bare overflow-x-auto py-3.5",
        className
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
