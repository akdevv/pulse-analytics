"use client";

import { useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowUp,
  ChevronDown,
  Database,
  Plus,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import {
  useAsk,
  useConversation,
  useConversations,
  useDeleteConversation,
} from "@/hooks/useAi";
import { Markdown } from "@/components/ai/markdown";
import { ResultTable } from "@/components/ai/result-table";
import type { AskResult, ConversationSummary } from "@/lib/types/ai.types";

// What the thread shows. A live answer carries its rows; a reloaded one cannot,
// because rows are deliberately never stored (see the AiMessage model).
type Turn =
  | { role: "user"; text: string }
  | { role: "assistant"; result: AskResult }
  | {
      role: "assistant";
      replayed: {
        text: string;
        sql: string | null;
        rows: Record<string, unknown>[] | null;
      };
    };

const EXAMPLES = [
  "Top pages last week",
  "Which countries sent the most traffic?",
  "Browser split for yesterday",
];

const MAX_QUESTION = 500;

const relativeTime = (iso: string): string => {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
};

function SqlDisclosure({ sql }: { sql: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-md font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <ChevronDown
          className={`size-3.5 transition-transform duration-200 ${open ? "" : "-rotate-90"}`}
        />
        {open ? "Hide SQL" : "Show SQL"}
      </button>
      {open && (
        <pre className="animate-in fade-in slide-in-from-top-1 mt-2 overflow-x-auto rounded-lg border border-border bg-muted/50 p-3 font-mono text-xs leading-relaxed duration-200 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar]:h-2">
          <code>{sql}</code>
        </pre>
      )}
    </div>
  );
}

function Answer({ result, question }: { result: AskResult; question: string }) {
  if (result.kind === "chat") return <Markdown>{result.reply}</Markdown>;

  // A refusal is information, not a failure — the model saying the data cannot
  // answer this. It reads calm; only a broken query reads as an error.
  if (result.kind === "refuse") {
    return (
      <div className="flex gap-3 rounded-lg border border-border bg-muted/40 p-3.5">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <div className="text-muted-foreground">
          <Markdown>{result.reply}</Markdown>
        </div>
      </div>
    );
  }

  if (result.kind === "error") {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3.5">
        <div className="flex gap-3">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
          <div className="min-w-0">
            <p className="text-sm font-medium">That query could not run</p>
            <p className="mt-1 font-mono text-xs break-words text-destructive">
              {result.error}
            </p>
          </div>
        </div>
        <SqlDisclosure sql={result.sql} />
      </div>
    );
  }

  // "matched nothing" would be a lie when rows existed and were withheld.
  const allWithheld = result.rowCount === 0 && result.suppressed > 0;

  return (
    <div>
      {result.summary && (
        <div className="mb-3">
          <Markdown>{result.summary}</Markdown>
        </div>
      )}
      {allWithheld ? (
        <div className="flex gap-3 rounded-lg border border-border bg-muted/40 p-3.5">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <p className="text-sm leading-relaxed text-muted-foreground">
            {result.suppressed === 1
              ? "The one matching row was withheld: it covers fewer than 3 pageviews"
              : `All ${result.suppressed} matching rows were withheld: each covers fewer than 3 pageviews`}
            , which can describe a single person. Ask for a wider range or a
            broader grouping.
          </p>
        </div>
      ) : result.summary && result.rowCount === 0 ? null : (
        <ResultTable rows={result.rows} caption={question} />
      )}
      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-muted-foreground">
        <span className="tabular-nums">
          {result.rowCount.toLocaleString()} row
          {result.rowCount === 1 ? "" : "s"}
        </span>
        <span aria-hidden>·</span>
        <span className="tabular-nums">{result.latencyMs}ms</span>
        {result.truncated && (
          <>
            <span aria-hidden>·</span>
            <span className="text-primary">truncated at 1000</span>
          </>
        )}
        {result.suppressed > 0 && (
          <>
            <span aria-hidden>·</span>
            <span title="Rows with fewer than 3 pageviews are withheld so a single visitor cannot be singled out">
              {result.suppressed} row{result.suppressed === 1 ? "" : "s"} withheld
            </span>
          </>
        )}
      </div>
      <SqlDisclosure sql={result.sql} />
    </div>
  );
}

function ThreadList({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
  deletingId,
}: {
  conversations?: ConversationSummary[];
  activeId?: string;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  deletingId?: string;
}) {
  return (
    <>
      <button
        type="button"
        onClick={onNew}
        className="flex w-full items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium transition-colors hover:border-primary/40 hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <Plus className="size-4 text-primary" />
        New question
      </button>

      <p className="px-1 font-mono text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
        Recent
      </p>

      {conversations?.length ? (
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0">
          {conversations.map((c) => {
            const active = c.id === activeId;
            return (
              <div
                key={c.id}
                className={`group relative w-56 shrink-0 rounded-lg border transition-colors lg:w-full ${
                  active
                    ? "border-primary/40 bg-accent/60"
                    : "border-transparent hover:bg-accent/40"
                } ${deletingId === c.id ? "opacity-50" : ""}`}
              >
                <button
                  type="button"
                  onClick={() => onSelect(c.id)}
                  aria-current={active ? "true" : undefined}
                  title={c.title}
                  className="w-full rounded-lg px-3 py-2 pr-9 text-left focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  <span className="block truncate text-sm text-foreground/90">
                    {c.title}
                  </span>
                  <span className="mt-0.5 block font-mono text-[10px] text-muted-foreground">
                    {relativeTime(c.updatedAt)}
                  </span>
                </button>
                {/* Always reachable by keyboard; revealed on hover for the mouse. */}
                <button
                  type="button"
                  onClick={() => onDelete(c.id)}
                  disabled={deletingId === c.id}
                  aria-label={`Delete conversation: ${c.title}`}
                  className="absolute top-1.5 right-1.5 rounded-md p-1.5 text-muted-foreground opacity-0 transition-all group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none disabled:opacity-30"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="px-1 text-xs text-muted-foreground">
          Questions you ask are kept here.
        </p>
      )}
    </>
  );
}

export function AskPanel({ siteId }: { siteId: string }) {
  const [liveTurns, setLiveTurns] = useState<Turn[]>([]);
  const [liveConversationId, setLiveConversationId] = useState<string>();
  const [replayId, setReplayId] = useState<string>();
  const [question, setQuestion] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const askMutation = useAsk(siteId);
  const deleteMutation = useDeleteConversation(siteId);
  const { data: conversations } = useConversations(siteId);
  // Stored messages are only fetched when a past thread is opened — the live
  // thread already holds everything, including the rows the server never keeps.
  const { data: replayed } = useConversation(siteId, replayId);

  const conversationId = liveConversationId ?? replayId;

  // Derived, not copied into state: an effect that mirrored the query into
  // setTurns would re-render on every refetch and fight the live turns.
  const turns = useMemo<Turn[]>(
    () => [
      ...(replayed?.messages ?? []).map((m): Turn =>
        m.role === "USER"
          ? { role: "user", text: m.content }
          : {
              role: "assistant",
              replayed: {
                text: m.error ?? m.content,
                sql: m.sql,
                rows: m.rows,
              },
            }
      ),
      ...liveTurns,
    ],
    [replayed, liveTurns]
  );

  // Scrolled when a turn is added, not on every keystroke or refetch.
  const scrollToEnd = () =>
    requestAnimationFrame(() =>
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
    );

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || askMutation.isPending) return;

    setLiveTurns((t) => [...t, { role: "user", text: trimmed }]);
    setQuestion("");
    scrollToEnd();

    askMutation.mutate(
      { question: trimmed, conversationId },
      {
        onSuccess: (result) => {
          setLiveConversationId(result.conversationId);
          setLiveTurns((t) => [...t, { role: "assistant", result }]);
          scrollToEnd();
        },
        onError: (err) => {
          setLiveTurns((t) => [
            ...t,
            {
              role: "assistant",
              replayed: { text: err.message, sql: null, rows: null },
            },
          ]);
          scrollToEnd();
        },
      }
    );
  };

  const startNew = () => {
    setLiveConversationId(undefined);
    setReplayId(undefined);
    setLiveTurns([]);
  };

  const remaining = MAX_QUESTION - question.length;

  return (
    <div className="grid gap-5 selection:bg-primary/20 lg:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className="space-y-2.5">
        <ThreadList
          conversations={conversations}
          activeId={conversationId}
          onSelect={(id) => {
            setReplayId(id);
            setLiveConversationId(undefined);
            setLiveTurns([]);
          }}
          onNew={startNew}
          deletingId={deleteMutation.variables}
          onDelete={(id) => {
            deleteMutation.mutate(id, {
              // Only reset the view when the thread on screen is the one gone.
              onSuccess: () => {
                if (id === conversationId) startNew();
              },
            });
          }}
        />
      </aside>

      <div className="flex min-h-[32rem] flex-col overflow-hidden rounded-xl border border-border bg-card">
        {/* What the model can actually see, stated where it is answered. */}
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
          <p className="truncate text-sm font-medium">
            {conversations?.find((c) => c.id === conversationId)?.title ??
              "New question"}
          </p>
          <span className="flex shrink-0 items-center gap-1.5 font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
            <Database className="size-3" />
            hourly · daily rollups
          </span>
        </div>

        <div
          role="log"
          aria-live="polite"
          aria-busy={askMutation.isPending}
          className="flex-1 space-y-7 overflow-y-auto p-5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar]:w-2"
        >
          {turns.length === 0 && (
            <div className="py-10">
              <h2 className="text-lg font-semibold tracking-tight">
                Ask about this site&apos;s traffic
              </h2>
              <p className="mt-1.5 max-w-prose text-sm leading-relaxed text-muted-foreground">
                Questions become SQL against the hourly and daily rollups. No raw
                events, no visitor identifiers — and every answer shows the query
                it ran.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {EXAMPLES.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => send(e)}
                    className="rounded-full border border-border px-3.5 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:bg-accent/50 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          )}

          {turns.map((turn, i) => (
            <div
              key={i}
              className="animate-in fade-in slide-in-from-bottom-2 duration-300"
            >
              {turn.role === "user" ? (
                <p className="text-[15px] leading-snug font-medium tracking-tight">
                  {turn.text}
                </p>
              ) : (
                <div className="mt-3 border-l border-primary/30 pl-4">
                  {"result" in turn ? (
                    <Answer
                      result={turn.result}
                      question={
                        (turns[i - 1] as { text?: string })?.text ?? "Results"
                      }
                    />
                  ) : (
                    <div>
                      {turn.replayed.rows ? (
                        <ResultTable
                          rows={turn.replayed.rows}
                          caption={
                            (turns[i - 1] as { text?: string })?.text ??
                            "Results"
                          }
                        />
                      ) : (
                        <div className="text-muted-foreground">
                          <Markdown>{turn.replayed.text}</Markdown>
                        </div>
                      )}
                      {turn.replayed.sql && (
                        <>
                          <SqlDisclosure sql={turn.replayed.sql} />
                          {turn.replayed.rows && (
                            <p className="mt-1.5 font-mono text-[11px] text-muted-foreground">
                              re-run just now · rows are never stored
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {askMutation.isPending && (
            <div className="mt-3 border-l border-primary/30 pl-4">
              <p className="font-mono text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
                Writing SQL
              </p>
              <div className="mt-2.5 space-y-2">
                {[100, 78, 88].map((w, i) => (
                  <div
                    key={w}
                    className="h-3 animate-pulse rounded bg-muted"
                    style={{ width: `${w}%`, animationDelay: `${i * 140}ms` }}
                  />
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="border-t border-border p-3">
          <div className="rounded-lg border border-border bg-background transition-colors focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/15">
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value.slice(0, MAX_QUESTION))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(question);
                }
              }}
              rows={2}
              placeholder="Ask about your traffic…"
              aria-label="Ask a question about this site's traffic"
              className="w-full resize-none bg-transparent px-3.5 py-2.5 text-sm caret-primary outline-none placeholder:text-muted-foreground"
            />
            <div className="flex items-center justify-between gap-3 px-3.5 pb-2.5">
              <span className="font-mono text-[10px] tracking-[0.1em] text-muted-foreground uppercase">
                {remaining <= 100
                  ? `${remaining} characters left`
                  : "Enter to send · Shift+Enter for a new line"}
              </span>
              <button
                type="button"
                onClick={() => send(question)}
                disabled={!question.trim() || askMutation.isPending}
                aria-label="Send question"
                className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-all hover:brightness-110 focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-30"
              >
                <ArrowUp className="size-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
