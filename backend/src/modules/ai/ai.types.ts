import { z } from "zod";

// The model's entire allowed output. Anything else gets one repair attempt,
// then a hard stop.
export const modelReplySchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("query"), sql: z.string().min(1) }),
  z.object({ kind: z.literal("chat"), reply: z.string().min(1) }),
  z.object({ kind: z.literal("refuse"), reply: z.string().min(1) }),
]);

export type ModelReply = z.infer<typeof modelReplySchema>;

// Replayed as context. Questions and replies only, never result rows.
export type ChatTurn = { role: "user" | "assistant"; content: string };

export const askSchema = z.object({
  question: z.string().trim().min(1).max(500),
  // Omit to start a new conversation. History comes from the database, so a
  // caller cannot rewrite its own past turns.
  conversationId: z.uuid().optional(),
});

export type AskBody = z.infer<typeof askSchema>;

// "error" means SQL that failed twice, answered with the failure, not rows.
export type AskResult = { conversationId: string } & AskOutcome;

export type AskOutcome =
  | {
      kind: "query";
      sql: string;
      // From the second model call, absent if it failed.
      summary?: string | undefined;
      rows: Record<string, unknown>[];
      rowCount: number;
      truncated: boolean;
      suppressed: number;
      latencyMs: number;
    }
  | { kind: "chat" | "refuse"; reply: string }
  | { kind: "error"; sql: string; error: string };
