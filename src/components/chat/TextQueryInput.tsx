"use client";

import { Loader2, Send } from "lucide-react";
import { useState, type FormEvent } from "react";

import { createId } from "@/lib/createId";
import { useConversationStore } from "@/store/conversationStore";
import type { DocumentChunkMatch } from "@/lib/rag/search";

async function askQuestion(question: string): Promise<{ answer: string; sources: DocumentChunkMatch[] }> {
  const response = await fetch("/api/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      body && typeof body === "object" && "error" in body
        ? String((body as { error: unknown }).error)
        : `Failed to get an answer (status ${response.status}).`;
    throw new Error(message);
  }

  return body as { answer: string; sources: DocumentChunkMatch[] };
}

/**
 * A text-input fallback to voice, for testing the assistant without a
 * microphone. Goes through the same /api/query -> generateAnswer path as the
 * voice tool call, and appends to the same conversation store as
 * useVapiCall, so both interleave in one ordered history (see phase 33).
 */
export function TextQueryInput() {
  const addMessage = useConversationStore((state) => state.addMessage);
  const [value, setValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const question = value.trim();
    if (!question || isSending) return;

    setValue("");
    setError(null);
    addMessage({ id: createId(), role: "user", content: question });
    setIsSending(true);

    try {
      const { answer, sources } = await askQuestion(question);
      addMessage({
        id: createId(),
        role: "assistant",
        content: answer,
        sources: sources.map((source) => ({
          documentName: source.document_name,
          similarity: source.similarity,
        })),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to get an answer.";
      setError(message);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-2xl flex-col gap-1.5">
      <div className="flex items-center gap-2 rounded-2xl border border-border bg-surface-raised px-2 py-1.5 shadow-sm transition-all duration-200 focus-within:border-accent/50 focus-within:shadow-md">
        <input
          type="text"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Type a question to test the assistant…"
          disabled={isSending}
          className="flex-1 bg-transparent px-3 py-2 text-[15px] text-foreground placeholder:text-foreground-muted focus:outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isSending || !value.trim()}
          aria-label="Send test question"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-background transition-all duration-200 hover:scale-105 hover:bg-accent-hover disabled:pointer-events-none disabled:opacity-40"
        >
          {isSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </div>

      {error && <p className="px-1 text-xs text-danger">{error}</p>}
    </form>
  );
}
