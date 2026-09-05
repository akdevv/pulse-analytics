import fs from "node:fs";
import path from "node:path";
import env from "@/config/env.ts";
import logger from "@/utils/logger.ts";
import { AppError } from "@/utils/app-error.ts";
import { verifySiteOwnership } from "@/modules/analytics/analytics.service.ts";
import { runQuery, SqlRunError } from "./ai.runner.ts";
import { validateSql } from "./ai.validator.ts";
import * as AiRepository from "./ai.repository.ts";
import {
  modelReplySchema,
  type AskOutcome,
  type AskResult,
  type ChatTurn,
  type ModelReply,
} from "./ai.types.ts";

// Free tiers are slow under load; 20s is generous but bounded.
const AI_TIMEOUT_MS = 20_000;

// How many past statements to re-run when a thread is opened. Each one can hold
// a connection for up to the runner's 5s statement_timeout, on a pool of 2 that
// asks also share — so this is a latency and starvation budget, not a display
// preference. Older answers in a long thread show their SQL without rows.
const REPLAY_LIMIT = 4;

// Prompts live in .md files so they can be read and edited as prose rather than
// as escaped template literals. Read once at startup: they never change
// while the process runs, and a missing file should fail loudly at boot rather
// than on the first question.
//
// Production runs the TypeScript source (see the Dockerfile CMD), so this path
// resolves the same in dev and in the container. Switching the container to run
// the bundled dist/ would mean copying these files alongside it.
const readPrompt = (file: string) =>
  fs.readFileSync(path.join(import.meta.dirname, file), "utf8");

// Call #1 turns a question into SQL; call #2 turns the resulting rows into a
// sentence. Neither model does the other's job.
const SQL_TEMPLATE = readPrompt("sql.prompt.md");
const SUMMARY_TEMPLATE = readPrompt("summary.prompt.md");

// Rows sent to the summariser. Enough to describe a top-N answer, few enough
// that a 1000-row result cannot blow up the request.
const SUMMARY_ROW_LIMIT = 20;

export const buildSystemPrompt = (now = new Date()): string =>
  // The HTML comment block is a note to whoever edits the file, not instructions
  // for the model, so it never reaches the provider.
  stripNotes(
    SQL_TEMPLATE.replaceAll("{{TODAY}}", now.toISOString().slice(0, 10))
  );

const stripNotes = (text: string) =>
  text.replace(/<!--[\s\S]*?-->\s*/g, "").trim();

// repairError is the message from a failed validation or execution. Handing the
// model its own error back is the one retry allowed before we give up.
const buildMessages = (
  question: string,
  history: ChatTurn[] = [],
  repair?: { sql: string; error: string }
) => [
  { role: "system" as const, content: buildSystemPrompt() },
  ...history,
  { role: "user" as const, content: question },
  // The rejected statement goes back with the error. Without it the model is
  // asked to fix SQL it cannot see, and at temperature 0 it tends to reproduce
  // exactly the statement that just failed.
  ...(repair
    ? [
        {
          role: "assistant" as const,
          content: JSON.stringify({ kind: "query", sql: repair.sql }),
        },
        {
          role: "user" as const,
          content: `That SQL failed with: ${repair.error}\nReturn corrected JSON.`,
        },
      ]
    : []),
];

export const aiEnabled = (): boolean =>
  Boolean(env.AI_API_KEY && env.AI_DATABASE_URL);

type Message = { role: "system" | "user" | "assistant"; content: string };

// One fetch against an OpenAI-compatible /chat/completions. No SDK, no provider
// abstraction — Groq, Cerebras, OpenRouter and Gemini all speak this shape, so
// switching provider is three env vars.
// json: true asks the provider for a JSON object, which call #1 needs. Call #2
// returns prose, and Groq rejects json_object unless the word "json" appears in
// the messages, so the format is a parameter rather than a constant.
const complete = async (
  messages: Message[],
  { json = true }: { json?: boolean } = {}
): Promise<string> => {
  if (!env.AI_API_KEY) throw AppError.internal("AI querying is not configured");

  const res = await fetch(`${env.AI_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.AI_API_KEY}`,
    },
    body: JSON.stringify({
      model: env.AI_MODEL,
      messages,
      temperature: 0, // same question, same SQL — also makes the cache worth having
      ...(json && { response_format: { type: "json_object" as const } }),
    }),
    signal: AbortSignal.timeout(AI_TIMEOUT_MS),
  });

  if (!res.ok) {
    const body = await res.text();
    logger.error("[ai.service] provider error", null, {
      status: res.status,
      body,
    });
    // 429 is a free-tier cap, not our bug — say so rather than a blanket 500.
    if (res.status === 429) {
      throw new AppError(429, "AI is out of budget right now, try again later");
    }
    throw AppError.internal("AI provider request failed");
  }

  const payload = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw AppError.internal("AI returned an empty response");
  return content;
};

// Models fence JSON even when told not to. Cheaper to strip it than to retry.
const stripFence = (text: string): string =>
  text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/, "")
    .trim();

const parseReply = (content: string): ModelReply | undefined => {
  try {
    const parsed = modelReplySchema.safeParse(JSON.parse(stripFence(content)));
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
};

// Call #1: question in, SQL out. This model never sees a database row.
export const generateQuery = async (
  question: string,
  history: ChatTurn[] = [],
  repair?: { sql: string; error: string }
): Promise<ModelReply> => {
  const messages = buildMessages(question, history, repair);
  const content = await complete(messages);

  const reply = parseReply(content);
  if (reply) return reply;

  // One retry, with its own broken output handed back. A second failure is a
  // model that cannot follow the contract — stop, don't spend a third request.
  logger.warn("[ai.service] unparseable reply, retrying once", { content });
  const retry = parseReply(
    await complete([
      ...messages,
      { role: "assistant", content },
      {
        role: "user",
        content:
          'That was not valid JSON matching the contract. Reply with only {"kind":...} and nothing else.',
      },
    ])
  );
  if (retry) return retry;

  throw AppError.internal("AI returned an unusable response");
};

// Validate, then run. Both failure modes come back the same way, because the
// caller does the same thing with either: hand the message to the model once.
type Attempt =
  | { ok: true; result: Awaited<ReturnType<typeof runQuery>> }
  | { ok: false; error: string; repairable: boolean };

const attempt = async (sql: string, siteId: string): Promise<Attempt> => {
  const verdict = await validateSql(sql);
  if (!verdict.ok) {
    logger.warn("[ai.service] validator rejected sql", {
      sql,
      reason: verdict.reason,
    });
    return { ok: false, error: verdict.reason, repairable: true };
  }

  try {
    return { ok: true, result: await runQuery(sql, siteId) };
  } catch (err) {
    if (err instanceof SqlRunError) {
      return { ok: false, error: err.message, repairable: err.repairable };
    }
    throw err;
  }
};

// Call #2: rows in, prose out. This model sees database content and cannot
// write SQL; the model that writes SQL never sees a row. That split is what
// makes a poisoned pathname or referrer worthless to an attacker.
//
// Failure here is never fatal. The table is the answer; the sentence is a
// courtesy, so a rate-limited or slow provider costs the prose, not the result.
const summarize = async (
  question: string,
  sql: string,
  rows: Record<string, unknown>[]
): Promise<string | undefined> => {
  try {
    const sample = rows.slice(0, SUMMARY_ROW_LIMIT);
    const omitted = rows.length - sample.length;

    const text = await complete(
      [
        { role: "system", content: stripNotes(SUMMARY_TEMPLATE) },
        {
          role: "user",
          content: [
            `Question: ${question}`,
            `SQL: ${sql}`,
            `Rows (${rows.length} total${omitted > 0 ? `, first ${sample.length} shown` : ""}):`,
            JSON.stringify(sample),
          ].join("\n"),
        },
      ],
      { json: false }
    );
    return text.trim() || undefined;
  } catch (err) {
    logger.warn("[ai.service] summary failed, returning rows only", {
      error: err instanceof Error ? err.message : String(err),
    });
    return undefined;
  }
};

// The whole ask, in order. Ownership is checked before the model is called —
// no site, no request, no token spend (notes §2).
export const ask = async (
  siteId: string,
  userId: string,
  question: string,
  conversationId?: string
): Promise<AskResult> => {
  if (!aiEnabled()) {
    throw new AppError(503, "AI querying is not enabled on this deployment");
  }

  await verifySiteOwnership(siteId, userId);

  // A conversation id from the client is checked against the same user and
  // site, so it cannot be used to read or extend someone else's thread.
  const conversation = conversationId
    ? await AiRepository.getConversationForUser(conversationId, userId, siteId)
    : await AiRepository.createConversation(userId, siteId, question);
  if (!conversation) throw AppError.notFound("Conversation");

  const history = conversationId
    ? await AiRepository.recentTurns(conversation.id)
    : [];

  const outcome = await answer(siteId, question, history);
  await AiRepository.saveTurn(conversation.id, question, {
    conversationId: conversation.id,
    ...outcome,
  });

  return { conversationId: conversation.id, ...outcome };
};

const answer = async (
  siteId: string,
  question: string,
  history: ChatTurn[]
): Promise<AskOutcome> => {
  const reply = await generateQuery(question, history);
  if (reply.kind !== "query") return { kind: reply.kind, reply: reply.reply };

  const first = await attempt(reply.sql, siteId);
  if (first.ok) {
    return {
      kind: "query",
      sql: reply.sql,
      ...first.result,
      summary: await summarize(question, reply.sql, first.result.rows),
    };
  }
  if (!first.repairable) {
    return { kind: "error", sql: reply.sql, error: first.error };
  }

  // One repair attempt with the rejection handed back. A second failure stops
  // here — a third LLM request buys nothing but free-tier budget.
  logger.warn("[ai.service] repairing rejected sql", {
    sql: reply.sql,
    error: first.error,
  });
  const repaired = await generateQuery(question, history, {
    sql: reply.sql,
    error: first.error,
  });
  if (repaired.kind !== "query") {
    return { kind: repaired.kind, reply: repaired.reply };
  }

  const second = await attempt(repaired.sql, siteId);
  return second.ok
    ? {
        kind: "query",
        sql: repaired.sql,
        ...second.result,
        summary: await summarize(question, repaired.sql, second.result.rows),
      }
    : { kind: "error", sql: repaired.sql, error: second.error };
};

export const listConversations = async (siteId: string, userId: string) => {
  await verifySiteOwnership(siteId, userId);
  return AiRepository.listConversations(userId, siteId);
};

export const getConversation = async (
  siteId: string,
  userId: string,
  conversationId: string
) => {
  await verifySiteOwnership(siteId, userId);
  const conversation = await AiRepository.getConversationForUser(
    conversationId,
    userId,
    siteId
  );
  if (!conversation) throw AppError.notFound("Conversation");

  const messages = await AiRepository.listMessages(conversationId);

  // Rows are re-run, never stored (notes §7). Storing them would put
  // visitor-derived data in a second table that outlives the retention policy
  // on events; re-running costs one ~20ms query and cannot go stale. Only the
  // most recent statements are replayed, so opening an old thread stays cheap.
  const replayable = messages
    .filter((m) => m.sql && !m.error)
    .slice(-REPLAY_LIMIT);
  const rowsBySql = new Map<string, Record<string, unknown>[]>();
  for (const message of replayable) {
    const outcome = await attempt(message.sql!, siteId);
    if (outcome.ok) rowsBySql.set(message.id, outcome.result.rows);
  }

  return {
    ...conversation,
    messages: messages.map((m) => ({
      ...m,
      rows: rowsBySql.get(m.id) ?? null,
    })),
  };
};

export const deleteConversation = async (
  siteId: string,
  userId: string,
  conversationId: string
) => {
  await verifySiteOwnership(siteId, userId);
  const deleted = await AiRepository.deleteConversation(
    conversationId,
    userId,
    siteId
  );
  if (!deleted) throw AppError.notFound("Conversation");
};
