import Groq from "groq-sdk";

import { buildContext } from "@/lib/rag/context";
import { searchDocuments } from "@/lib/rag/search";
import type { DocumentChunkMatch } from "@/lib/rag/search";

const CHAT_MODEL = "llama-3.3-70b-versatile";

const SYSTEM_PROMPT = `You are a voice assistant that answers questions about the user's uploaded documents.

Answer only using the context provided below the question — never use outside knowledge. If the context
doesn't contain the answer, say so clearly and briefly (e.g. "The documents don't cover that.") instead of
guessing or making something up.

Keep answers short and conversational: a sentence or two in most cases, since they will be read aloud by a
voice assistant. Never use bullet points, numbered lists, markdown, or headings — just plain spoken sentences.`;

let client: Groq | null = null;

function getClient(): Groq {
  if (client) return client;

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GROQ_API_KEY environment variable.");
  }

  client = new Groq({ apiKey });
  return client;
}

export interface GenerateAnswerOptions {
  matchCount?: number;
  documentIds?: string[];
}

export interface GeneratedAnswer {
  answer: string;
  sources: DocumentChunkMatch[];
}

/**
 * Answers `question` by retrieving the most relevant chunks via vector
 * search, assembling them into a labeled context block, and asking Groq's
 * llama-3.3-70b-versatile model to answer strictly from that context. Returns
 * both the generated answer and the source chunks it was grounded in, so
 * callers can cite or display them alongside the spoken answer.
 */
export async function generateAnswer(
  question: string,
  { matchCount, documentIds }: GenerateAnswerOptions = {}
): Promise<GeneratedAnswer> {
  const sources = await searchDocuments(question, { matchCount, documentIds });
  const context = buildContext(sources);

  const completion = await getClient().chat.completions.create({
    model: CHAT_MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Context:\n${context || "(no matching documents found)"}\n\nQuestion: ${question}`,
      },
    ],
  });

  const answer = completion.choices[0]?.message?.content?.trim();
  if (!answer) {
    throw new Error("Groq returned no answer content.");
  }

  return { answer, sources };
}
