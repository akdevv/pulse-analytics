import { MousePointer2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { highlight } from "./highlight";
import { PulseLogo, Reveal, SectionHeading } from "./shared";
import { STAGE } from "./surfaces";

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
  { value: "0", label: "Cookies set" },
  { value: "204", label: "Every ingest reply" },
  { value: "100", label: "Rows per insert" },
  { value: "10k/s", label: "Target, load test pending" },
];

const LIVE_FEED = [
  { path: "/pricing", country: "DE", ago: "now" },
  { path: "/docs/quickstart", country: "IN", ago: "4s" },
  { path: "/", country: "US", ago: "9s" },
];

const WELL = "rounded-xl bg-well shadow-well";

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
              <div className="flex h-full flex-col justify-center gap-2.5 p-6 pb-2">
                <Bubble side="right">
                  Which countries sent the most mobile traffic this week?
                </Bubble>
                <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
                  <Snippet html={sql} />
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
                </div>
                <div className="flex items-end gap-2.5">
                  <PulseLogo size={24} />
                  <Bubble side="left">
                    India sent the most, {ASK_ROWS[0].pageviews} pageviews, then
                    the US and Germany.
                  </Bubble>
                </div>
              </div>
            }
          />

          <Tile
            title="Who's on the site right now."
            description="A live count and event feed, streamed over server-sent events."
            className="md:col-span-2"
            visual={
              <div className="grid h-full grid-cols-1 items-end gap-5 p-6 pb-2 sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-8">
                <div>
                  <div className="flex items-center gap-2 text-[13px] text-ink/55">
                    <span className="relative flex size-2">
                      <span className="absolute inline-flex size-full animate-ping rounded-full bg-powder opacity-60 motion-reduce:hidden" />
                      <span className="relative inline-flex size-2 rounded-full bg-powder" />
                    </span>
                    On the site now
                  </div>
                  <div className="mt-2 font-display text-[56px] leading-none font-semibold tracking-logo text-ink tabular-nums">
                    247
                  </div>
                </div>
                <ul className={cn(WELL, "px-4 py-2 font-mono text-[11.5px]")}>
                  {LIVE_FEED.map((e) => (
                    <li
                      key={e.path}
                      className="flex items-center gap-3 py-1 text-ink/55"
                    >
                      <span className="min-w-0 flex-1 truncate text-ink/75">
                        {e.path}
                      </span>
                      <span>{e.country}</span>
                      <span className="w-8 text-right text-ink/35">
                        {e.ago}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            }
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
            visual={
              <div className="grid h-full grid-cols-1 items-center gap-6 p-6 pb-2 sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-8">
                <div className="relative mx-auto mt-8 w-fit sm:mx-0 sm:mt-6">
                  <span className="inline-flex rounded-full bg-linear-to-b from-tangerine-soft to-tangerine px-5 py-2.5 text-[14px] font-medium text-charcoal shadow-glow">
                    Sign up
                  </span>
                  <span className="absolute -top-9 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-powder/20 bg-powder/10 px-2.5 py-1 font-mono text-[11px] whitespace-nowrap text-powder">
                    signup
                    <span className="text-powder/60">+1</span>
                  </span>
                  <MousePointer2
                    aria-hidden
                    size={22}
                    strokeWidth={1.5}
                    className="absolute -right-3 -bottom-3 fill-ink text-charcoal"
                  />
                </div>
                <Snippet html={eventHtml} />
              </div>
            }
          />

          <Tile
            title="By the numbers."
            description="10k/s is the design target until the load test runs."
            className="md:col-span-2"
            visual={
              <dl className="grid h-full grid-cols-2 content-center gap-x-6 gap-y-5 p-6 pb-2 sm:grid-cols-4 lg:grid-cols-2">
                {NUMBERS.map(({ value, label }) => (
                  <div key={label} className="flex flex-col gap-1.5">
                    <dt className="order-2 text-[12.5px] leading-snug text-ink/45">
                      {label}
                    </dt>
                    <dd className="order-1 font-display text-[34px] leading-none font-semibold tracking-[-0.03em] text-ink tabular-nums">
                      {value}
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
    <div
      className={cn(
        "flex min-h-64 flex-col overflow-hidden rounded-2xl border border-ink/8 bg-surface-1 transition-colors duration-200 ease-out hover:border-ink/14",
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
    </div>
  );
}

function Bubble({
  side,
  children,
}: {
  side: "left" | "right";
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "max-w-[85%] rounded-2xl px-4 py-2.5 text-[13.5px]",
        side === "right"
          ? "ml-auto rounded-br-md bg-ink/7 text-ink/85"
          : "mr-auto rounded-bl-md border border-ink/8 text-ink/70"
      )}
    >
      {children}
    </div>
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
