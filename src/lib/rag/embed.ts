import { GoogleGenAI } from "@google/genai";

// text-embedding-004 has been retired; gemini-embedding-001 is its successor.
// It defaults to 3072-dim output, so outputDimensionality truncates it (via
// Matryoshka representation learning) to the 768 dims schema.sql's
// document_chunks.embedding column expects.
const EMBEDDING_MODEL = "gemini-embedding-001";
const EMBEDDING_DIMENSIONS = 768;
const DEFAULT_CONCURRENCY = 5;

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (client) return client;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY environment variable.");
  }

  client = new GoogleGenAI({ apiKey });
  return client;
}

async function embed(text: string, taskType: "RETRIEVAL_QUERY" | "RETRIEVAL_DOCUMENT"): Promise<number[]> {
  const response = await getClient().models.embedContent({
    model: EMBEDDING_MODEL,
    contents: text,
    config: { taskType, outputDimensionality: EMBEDDING_DIMENSIONS },
  });

  const values = response.embeddings?.[0]?.values;
  if (!values) {
    throw new Error("Gemini returned no embedding values.");
  }
  return values;
}

/** Embeds a single user question for similarity search against stored chunks. */
export async function embedQuery(text: string): Promise<number[]> {
  return embed(text, "RETRIEVAL_QUERY");
}

/**
 * Embeds a batch of document chunks for ingestion, running at most
 * `concurrency` requests at a time to avoid tripping Gemini's rate limits.
 */
export async function embedChunks(
  chunks: string[],
  concurrency = DEFAULT_CONCURRENCY
): Promise<number[][]> {
  const results: number[][] = new Array(chunks.length);
  let nextIndex = 0;

  async function worker() {
    for (let index = nextIndex++; index < chunks.length; index = nextIndex++) {
      results[index] = await embed(chunks[index], "RETRIEVAL_DOCUMENT");
    }
  }

  const workerCount = Math.min(concurrency, chunks.length);
  await Promise.all(Array.from({ length: workerCount }, worker));

  return results;
}
