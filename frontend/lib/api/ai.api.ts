import api from "@/lib/api/client";
import type {
  AskResult,
  Conversation,
  ConversationSummary,
} from "@/lib/types/ai.types";

// The model call can take a while on a free tier — the client's default 10s
// timeout is too tight for this one route.
export const ask = async (
  siteId: string,
  question: string,
  conversationId?: string
): Promise<{ data: AskResult }> =>
  api.post(
    `ai/${siteId}/ask`,
    { question, ...(conversationId && { conversationId }) },
    // Worst case is two model calls plus a repair round; leave room for it
    // rather than timing out on a request the server still bills and stores.
    { timeout: 90_000 }
  );

export const getConversations = async (
  siteId: string
): Promise<{ data: ConversationSummary[] }> =>
  api.get(`ai/${siteId}/conversations`);

// Opening a thread re-runs its stored SQL server-side, so it needs more than
// the client's 10s default.
export const getConversation = async (
  siteId: string,
  conversationId: string
): Promise<{ data: Conversation }> =>
  api.get(`ai/${siteId}/conversations/${conversationId}`, { timeout: 40_000 });

export const deleteConversation = async (
  siteId: string,
  conversationId: string
): Promise<void> => api.delete(`ai/${siteId}/conversations/${conversationId}`);
