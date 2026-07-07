import { embedQuery } from "@/lib/rag/embed";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

const DEFAULT_MATCH_COUNT = 5;

export interface SearchOptions {
  matchCount?: number;
  documentIds?: string[];
}

export interface DocumentChunkMatch {
  id: string;
  document_id: string;
  content: string;
  chunk_index: number;
  similarity: number;
}

/**
 * Embeds `query` with the same Gemini model used for document chunks, then
 * calls the match_documents RPC to find the most similar chunks via cosine
 * similarity. Pass `documentIds` to restrict the search to a subset of
 * documents; omit it (or pass an empty array) to search the whole corpus.
 */
export async function searchDocuments(
  query: string,
  { matchCount = DEFAULT_MATCH_COUNT, documentIds }: SearchOptions = {}
): Promise<DocumentChunkMatch[]> {
  const queryEmbedding = await embedQuery(query);

  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase.rpc("match_documents", {
    query_embedding: queryEmbedding,
    match_count: matchCount,
    filter_document_ids: documentIds && documentIds.length > 0 ? documentIds : null,
  });

  if (error) {
    throw new Error(`Vector search failed: ${error.message}`);
  }

  return (data ?? []) as DocumentChunkMatch[];
}
