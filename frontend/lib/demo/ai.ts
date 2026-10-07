import { devices, geo, pages, referrers, timeseries } from "@/lib/demo/data";
import type {
  AiMessage,
  AskResult,
  Conversation,
  ConversationSummary,
} from "@/lib/types/ai.types";

type Rows = Record<string, unknown>[];
type Intent = {
  test: RegExp;
  sql: string;
  run: (siteId: string) => Rows;
  summary: (rows: Rows) => string;
};

const DAY = 86_400_000;

function lastDays(days: number) {
  const to = new Date();
  return {
    from: new Date(to.getTime() - days * DAY).toISOString(),
    to: to.toISOString(),
    limit: 10,
  };
}

const share = (rows: Rows, key: string) => {
  const total = rows.reduce((s, r) => s + Number(r[key]), 0);
  return total ? Math.round((Number(rows[0]?.[key]) / total) * 100) : 0;
};

const INTENTS: Intent[] = [
  {
    test: /countr|geo|where|location/i,
    sql: `SELECT country, SUM(pageviews) AS pageviews
FROM ask_daily
WHERE bucket >= now() - interval '30 days'
GROUP BY country
ORDER BY pageviews DESC
LIMIT 10`,
    run: (id) =>
      geo(id, lastDays(30)).map((r) => ({
        country: r.country.toUpperCase(),
        pageviews: r.pageviews,
      })),
    summary: (rows) =>
      `**${rows[0]?.country}** sent the most traffic over the last 30 days, about ${share(rows, "pageviews")}% of pageviews from the top 10 countries.`,
  },
  {
    test: /browser|device|mobile|desktop|os\b|platform/i,
    sql: `SELECT browser, SUM(pageviews) AS pageviews
FROM ask_hourly
WHERE bucket >= date_trunc('day', now() - interval '1 day')
  AND bucket < date_trunc('day', now())
GROUP BY browser
ORDER BY pageviews DESC
LIMIT 20`,
    run: (id) =>
      devices(id, lastDays(1)).browsers.map((r) => ({
        browser: r.browser,
        pageviews: r.pageviews,
      })),
    summary: (rows) =>
      `**${rows[0]?.browser}** led yesterday with ${share(rows, "pageviews")}% of pageviews.`,
  },
  {
    test: /referr|source|came from|where.*from|channel/i,
    sql: `SELECT COALESCE(NULLIF(referrer, ''), 'Direct') AS referrer, SUM(pageviews) AS pageviews
FROM ask_hourly
WHERE bucket >= now() - interval '7 days'
GROUP BY 1
ORDER BY pageviews DESC
LIMIT 10`,
    run: (id) =>
      referrers(id, lastDays(7)).map((r) => ({
        referrer: r.source || "Direct",
        pageviews: r.pageviews,
      })),
    summary: (rows) =>
      `Most visits this week came from **${rows[0]?.referrer}** (${share(rows, "pageviews")}% of the top sources).`,
  },
  {
    test: /day|daily|trend|over time|per day|busiest/i,
    sql: `SELECT date_trunc('day', bucket) AS day, SUM(pageviews) AS pageviews, SUM(sessions) AS sessions
FROM ask_daily
WHERE bucket >= now() - interval '7 days'
GROUP BY 1
ORDER BY 1
LIMIT 10`,
    run: (id) =>
      timeseries(id, { ...lastDays(7), interval: "day" }).map((r) => ({
        day: r.time,
        pageviews: r.pageviews,
        sessions: r.sessions,
      })),
    summary: (rows) => {
      const best = [...rows].sort(
        (a, b) => Number(b.pageviews) - Number(a.pageviews)
      )[0];
      const day = best
        ? new Date(String(best.day)).toLocaleDateString("en", {
            weekday: "long",
          })
        : "";
      return `Daily pageviews for the last week. **${day}** was the busiest day.`;
    },
  },
  {
    test: /page|path|url|popular|top|visited/i,
    sql: `SELECT "urlPathname", SUM(pageviews) AS pageviews
FROM ask_daily
WHERE bucket >= now() - interval '7 days'
GROUP BY "urlPathname"
ORDER BY pageviews DESC
LIMIT 10`,
    run: (id) =>
      pages(id, lastDays(7)).map((r) => ({
        urlPathname: r.page,
        pageviews: r.pageviews,
      })),
    summary: (rows) =>
      `\`${rows[0]?.urlPathname}\` was the most viewed page last week, with ${Number(rows[0]?.pageviews).toLocaleString()} pageviews.`,
  },
];

const REFUSE = /visitor id|ip address|email|who (is|was)|identify|personal/i;

const CHAT_REPLY = `This is the demo, so I answer from sample data. Try asking about:

- **top pages** last week
- which **countries** sent the most traffic
- the **browser** split for yesterday
- where visitors **came from**
- **daily** traffic over the last week`;

const conversations = new Map<string, Conversation[]>();
let nextId = 1;

function answer(
  siteId: string,
  question: string,
  conversationId: string
): AskResult {
  if (REFUSE.test(question)) {
    return {
      conversationId,
      kind: "refuse",
      reply:
        "I can't answer that. Pulse never stores visitor identifiers, so there is nothing that could single out one person.",
    };
  }
  const intent = INTENTS.find((i) => i.test.test(question));
  if (!intent) return { conversationId, kind: "chat", reply: CHAT_REPLY };

  const rows = intent.run(siteId);
  return {
    conversationId,
    kind: "query",
    sql: intent.sql,
    summary: rows.length
      ? intent.summary(rows)
      : "Nothing matched in that range.",
    rows,
    rowCount: rows.length,
    truncated: false,
    suppressed: 0,
    latencyMs: 38 + Math.round(Math.random() * 60),
  };
}

export function ask(
  siteId: string,
  question: string,
  conversationId?: string
): AskResult {
  const list = conversations.get(siteId) ?? [];
  let convo = list.find((c) => c.id === conversationId);
  const now = new Date().toISOString();

  if (!convo) {
    convo = {
      id: `demo-convo-${nextId++}`,
      title: question.length > 60 ? `${question.slice(0, 57)}…` : question,
      createdAt: now,
      updatedAt: now,
      messages: [],
    };
    conversations.set(siteId, [convo, ...list]);
  }

  const result = answer(siteId, question, convo.id);
  const message = (
    role: AiMessage["role"],
    content: string,
    extra: Partial<AiMessage> = {}
  ): AiMessage => ({
    id: `${convo.id}-${convo.messages.length}`,
    role,
    content,
    sql: null,
    rows: null,
    rowCount: null,
    latencyMs: null,
    error: null,
    createdAt: now,
    ...extra,
  });

  convo.messages.push(message("USER", question));
  convo.messages.push(
    result.kind === "query"
      ? message("ASSISTANT", result.summary ?? "", {
          sql: result.sql,
          rows: result.rows,
          rowCount: result.rowCount,
          latencyMs: result.latencyMs,
        })
      : message("ASSISTANT", "reply" in result ? result.reply : "")
  );
  convo.updatedAt = now;

  return result;
}

export const listConversations = (siteId: string): ConversationSummary[] =>
  (conversations.get(siteId) ?? []).map(
    ({ id, title, createdAt, updatedAt }) => ({
      id,
      title,
      createdAt,
      updatedAt,
    })
  );

export const getConversation = (siteId: string, id: string) =>
  conversations.get(siteId)?.find((c) => c.id === id);

export function deleteConversation(siteId: string, id: string) {
  conversations.set(
    siteId,
    (conversations.get(siteId) ?? []).filter((c) => c.id !== id)
  );
}
