import { prisma } from "@/config/prisma.ts";
import type { AskResult, ChatTurn } from "./ai.types.ts";

// Conversations are always fetched with the owner in the predicate — never
// fetched then checked, so a wrong id reads as "not found" rather than leaking
// that it exists.
export const getConversationForUser = async (
  conversationId: string,
  userId: string,
  siteId: string
) =>
  prisma.conversation.findFirst({
    where: { id: conversationId, userId, siteId },
  });

export const listConversations = async (userId: string, siteId: string) =>
  prisma.conversation.findMany({
    where: { userId, siteId },
    orderBy: { updatedAt: "desc" },
    take: 50,
    select: { id: true, title: true, createdAt: true, updatedAt: true },
  });

export const listMessages = async (conversationId: string) =>
  prisma.aiMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
  });

// deleteMany, not delete: the owner is part of the predicate, so a wrong id
// deletes nothing instead of throwing and confirming the row exists. Messages
// go with it via onDelete: Cascade.
export const deleteConversation = async (
  conversationId: string,
  userId: string,
  siteId: string
) => {
  const { count } = await prisma.conversation.deleteMany({
    where: { id: conversationId, userId, siteId },
  });
  return count > 0;
};

export const createConversation = async (
  userId: string,
  siteId: string,
  question: string
) =>
  prisma.conversation.create({
    // The first question is the title. Renaming can come later if anyone cares.
    data: { userId, siteId, title: question.slice(0, 80) },
  });

// Prior turns for the model. Read from the database, never from the client —
// a caller cannot rewrite its own history to talk the model into something.
export const recentTurns = async (
  conversationId: string,
  limit = 6
): Promise<ChatTurn[]> => {
  const rows = await prisma.aiMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { role: true, content: true },
  });
  return rows
    .reverse()
    .map((r) => ({
      role: r.role === "USER" ? ("user" as const) : ("assistant" as const),
      content: r.content,
    }));
};

export const saveTurn = async (
  conversationId: string,
  question: string,
  result: AskResult
) => {
  // The assistant row is the audit log: the SQL is always stored, the rows
  // never are. Re-run the query to see rows again.
  const assistant =
    result.kind === "query"
      ? {
          // The summary is the stored answer when there is one: reopening a
          // thread then reads like the conversation it was, not a row count.
          content: result.summary ?? `Returned ${result.rowCount} row(s).`,
          sql: result.sql,
          rowCount: result.rowCount,
          latencyMs: result.latencyMs,
        }
      : result.kind === "error"
        ? { content: result.error, sql: result.sql, error: result.error }
        : { content: result.reply };

  // Timestamps are set here, not by CURRENT_TIMESTAMP. Inside one transaction
  // Postgres gives every row the transaction's start time, so both rows would
  // share a createdAt and the ordering of a replayed thread would be arbitrary
  // — the answer could render above its own question.
  const askedAt = new Date();
  const answeredAt = new Date(askedAt.getTime() + 1);

  await prisma.$transaction([
    prisma.aiMessage.create({
      data: {
        conversationId,
        role: "USER",
        content: question,
        createdAt: askedAt,
      },
    }),
    prisma.aiMessage.create({
      data: {
        conversationId,
        role: "ASSISTANT",
        ...assistant,
        createdAt: answeredAt,
      },
    }),
    prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: answeredAt },
    }),
  ]);
};
