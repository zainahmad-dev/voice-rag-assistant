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
    <form onSubmit={handleSubmit} className="flex w-full max-w-md flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Type a question to test the assistant…"
          disabled={isSending}
          className="flex-1 rounded-full border border-border bg-surface px-4 py-2 text-sm text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isSending || !value.trim()}
          aria-label="Send test question"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-background transition-colors duration-150 hover:bg-accent-hover disabled:opacity-50"
        >
          {isSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </div>

      {error && <p className="px-1 text-xs text-danger">{error}</p>}
    </form>
  );
}
