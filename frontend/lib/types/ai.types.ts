// Each member repeats conversationId rather than intersecting it onto a union —
// TypeScript narrows a plain discriminated union by `kind`, but not an
// intersection wrapped around one.
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
  // chat and refuse are separate members, not `kind: "chat" | "refuse"` —
  // TypeScript only narrows a member away when its discriminant is a single
  // literal.
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
  // Re-run at read time from the stored SQL, never persisted — see the
  // AiMessage model on the backend.
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
