import { apiDelete, apiGet, apiPost } from "@/lib/api/client";
import type {
  AskResult,
  Conversation,
  ConversationSummary,
} from "@/lib/types/ai.types";

// Asking can take two model calls plus a repair round, well past the 10s default.
export const ask = (
  siteId: string,
  question: string,
  conversationId?: string
) =>
  apiPost<AskResult>(
    `ai/${siteId}/ask`,
    { question, ...(conversationId && { conversationId }) },
    { timeout: 90_000 }
  );

export const getConversations = (siteId: string) =>
  apiGet<ConversationSummary[]>(`ai/${siteId}/conversations`);

// Opening a thread re-runs its stored SQL server-side.
export const getConversation = (siteId: string, conversationId: string) =>
  apiGet<Conversation>(`ai/${siteId}/conversations/${conversationId}`, {
    timeout: 40_000,
  });

export const deleteConversation = (siteId: string, conversationId: string) =>
  apiDelete(`ai/${siteId}/conversations/${conversationId}`);
