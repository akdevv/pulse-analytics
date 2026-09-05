import { z } from "zod";

// The model's entire allowed output. Anything else is a parse failure, gets one
// repair attempt, then a hard stop — the model never gets to invent a shape.
export const modelReplySchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("query"), sql: z.string().min(1) }),
  z.object({ kind: z.literal("chat"), reply: z.string().min(1) }),
  z.object({ kind: z.literal("refuse"), reply: z.string().min(1) }),
]);

export type ModelReply = z.infer<typeof modelReplySchema>;

// Prior turns, replayed as context. Only ever questions and the model's own
// replies — never result rows (notes §3).
export type ChatTurn = { role: "user" | "assistant"; content: string };

// Request body.
export const askSchema = z.object({
  question: z.string().trim().min(1).max(500),
  // Omit to start a new conversation. History is loaded from the database, not
  // taken from the client — a caller cannot rewrite its own past turns.
  conversationId: z.uuid().optional(),
});

export type AskBody = z.infer<typeof askSchema>;

// What an ask resolves to. "error" means the model produced SQL that failed
// twice — the question is answered with the failure, not with rows.
export type AskResult = { conversationId: string } & AskOutcome;

export type AskOutcome =
  | {
      kind: "query";
      sql: string;
      // One or two sentences from the second model call, absent if it failed.
      summary?: string | undefined;
      rows: Record<string, unknown>[];
      rowCount: number;
      truncated: boolean;
      suppressed: number;
      latencyMs: number;
    }
  | { kind: "chat" | "refuse"; reply: string }
  | { kind: "error"; sql: string; error: string };
