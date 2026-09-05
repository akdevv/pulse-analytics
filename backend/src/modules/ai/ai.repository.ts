import { prisma } from "@/config/prisma.ts";
import type { AskResult, ChatTurn } from "./ai.types.ts";

// Owner in the predicate, never fetch-then-check, so a wrong id reads as
// "not found" rather than confirming the row exists.
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

// deleteMany, not delete, so the owner can be part of the predicate. Messages
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
    // ponytail: first question is the title. Add renaming if anyone asks.
    data: { userId, siteId, title: question.slice(0, 80) },
  });

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
  // This row is the audit log. SQL is always stored, rows never are.
  const assistant =
    result.kind === "query"
      ? {
          // Stored so a reopened thread reads as prose, not a row count.
          content: result.summary ?? `Returned ${result.rowCount} row(s).`,
          sql: result.sql,
          rowCount: result.rowCount,
          latencyMs: result.latencyMs,
        }
      : result.kind === "error"
        ? { content: result.error, sql: result.sql, error: result.error }
        : { content: result.reply };

  // Set here, not by CURRENT_TIMESTAMP: inside one transaction Postgres gives
  // every row the same start time, so an answer could sort above its question.
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
