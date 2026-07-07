import type { DocumentChunkMatch } from "@/lib/rag/search";

/**
 * Formats retrieved chunks into a single labeled context block (e.g.
 * "[Source 1]\n...\n\n[Source 2]\n...") ready to be inserted into an LLM
 * prompt. Chunks are labeled in the order given, so callers should already
 * have them sorted (e.g. by similarity, as returned by searchDocuments).
 */
export function buildContext(chunks: DocumentChunkMatch[]): string {
  return chunks
    .map((chunk, index) => `[Source ${index + 1}]\n${chunk.content}`)
    .join("\n\n");
}
