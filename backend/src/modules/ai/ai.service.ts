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

// Free tiers are slow under load.
const AI_TIMEOUT_MS = 20_000;

// Statements re-run when a thread opens. Each can hold one of the pool's 2
// connections for the runner's full 5s, so this is a starvation budget, not a
// display choice. Older answers in a long thread show SQL without rows.
const REPLAY_LIMIT = 4;

// Prompts are .md files so they read as prose, not escaped template literals.
// Read at startup, so a missing file fails at boot, not on the first question.
// Production runs the TypeScript source (see the Dockerfile CMD), so this path
// resolves the same either way. Serving dist/ would need these copied along.
const readPrompt = (file: string) =>
  fs.readFileSync(path.join(import.meta.dirname, file), "utf8");

// Call #1 turns a question into SQL. Call #2 turns rows into a sentence.
const SQL_TEMPLATE = readPrompt("sql.prompt.md");
const SUMMARY_TEMPLATE = readPrompt("summary.prompt.md");

// Enough to describe a top-N answer, few enough that 1000 rows cannot bloat
// the request.
const SUMMARY_ROW_LIMIT = 20;

export const buildSystemPrompt = (now = new Date()): string =>
  // The HTML comment block is a note to editors, not the model.
  stripNotes(
    SQL_TEMPLATE.replaceAll("{{TODAY}}", now.toISOString().slice(0, 10))
  );

const stripNotes = (text: string) =>
  text.replace(/<!--[\s\S]*?-->\s*/g, "").trim();

const buildMessages = (
  question: string,
  history: ChatTurn[] = [],
  repair?: { sql: string; error: string }
) => [
  { role: "system" as const, content: buildSystemPrompt() },
  ...history,
  { role: "user" as const, content: question },
  // The rejected statement goes back with the error. Without it the model must
  // fix SQL it cannot see, and at temperature 0 it just reproduces it.
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

// ponytail: one fetch, no SDK. Every OpenAI-compatible provider speaks this
// shape, so switching is three env vars. json is a parameter because call #2
// returns prose, and Groq rejects json_object unless "json" is in the messages.
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
      temperature: 0, // same question, same SQL
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
    // A free-tier cap, not our bug, so pass it through rather than a 500.
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

// Models fence JSON even when told not to. Cheaper to strip than to retry.
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

// Question in, SQL out. This model never sees a database row.
export const generateQuery = async (
  question: string,
  history: ChatTurn[] = [],
  repair?: { sql: string; error: string }
): Promise<ModelReply> => {
  const messages = buildMessages(question, history, repair);
  const content = await complete(messages);

  const reply = parseReply(content);
  if (reply) return reply;

  // One retry with its own broken output handed back. A second failure means
  // the model cannot follow the contract, so stop rather than pay again.
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

// Both failure modes return the same shape, since the caller treats them alike.
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

// Rows in, prose out. This model cannot write SQL, and the one that writes SQL
// never sees a row. That split makes a poisoned pathname worthless to an
// attacker. Failure is never fatal: the table is the answer, prose is extra.
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

// Ownership is checked before the model is called, so no site, no token spend.
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

  // Resolved first: the id decides whether there is history to send, and it is
  // checked against this user and site so it cannot reach someone else's thread.
  const existing = conversationId
    ? await AiRepository.getConversationForUser(conversationId, userId, siteId)
    : null;
  if (conversationId && !existing) throw AppError.notFound("Conversation");

  const history = existing ? await AiRepository.recentTurns(existing.id) : [];

  // Before the thread is created, or a provider timeout would leave a
  // title-only row in the sidebar.
  const outcome = await answer(siteId, question, history);

  const conversation =
    existing ?? (await AiRepository.createConversation(userId, siteId, question));

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

  // One repair attempt. A third request buys nothing but free-tier budget.
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

  // Re-run, never stored. Storing rows would put visitor data in a table that
  // outlives the retention policy on events, and a re-run cannot go stale.
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
