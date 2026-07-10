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
 *
 * Only documents with status 'completed' (fully indexed) are ever searched —
 * one still mid-ingest or failed shouldn't be queryable even if leftover
 * chunks from a previous successful ingest still exist for it.
 */
export async function searchDocuments(
  query: string,
  { matchCount = DEFAULT_MATCH_COUNT, documentIds }: SearchOptions = {}
): Promise<DocumentChunkMatch[]> {
  const supabase = getSupabaseServiceClient();

  let readyDocumentsQuery = supabase.from("documents").select("id").eq("status", "completed");
  if (documentIds && documentIds.length > 0) {
    readyDocumentsQuery = readyDocumentsQuery.in("id", documentIds);
  }

  const { data: readyDocuments, error: readyError } = await readyDocumentsQuery;
  if (readyError) {
    throw new Error(`Failed to load ready documents: ${readyError.message}`);
  }

  const readyDocumentIds = (readyDocuments ?? []).map((document) => document.id as string);
  if (readyDocumentIds.length === 0) {
    return [];
  }

  const queryEmbedding = await embedQuery(query);

  const { data, error } = await supabase.rpc("match_documents", {
    query_embedding: queryEmbedding,
    match_count: matchCount,
    filter_document_ids: readyDocumentIds,
  });

  if (error) {
    throw new Error(`Vector search failed: ${error.message}`);
  }

  return (data ?? []) as DocumentChunkMatch[];
}
