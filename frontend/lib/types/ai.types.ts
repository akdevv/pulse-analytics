export type AskResult =
  | {
      conversationId: string;
      kind: "query";
      sql: string;
      summary?: string;
      rows: Record<string, unknown>[];
      rowCount: number;
      truncated: boolean;
      suppressed: number;
      latencyMs: number;
    }
  | { conversationId: string; kind: "chat"; reply: string }
  | { conversationId: string; kind: "refuse"; reply: string }
  | { conversationId: string; kind: "error"; sql: string; error: string };

export type ConversationSummary = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};

export type AiMessage = {
  // Re-run from the stored SQL at read time, never persisted.
  rows: Record<string, unknown>[] | null;
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
  sql: string | null;
  rowCount: number | null;
  latencyMs: number | null;
  error: string | null;
  createdAt: string;
};

export type Conversation = ConversationSummary & { messages: AiMessage[] };
