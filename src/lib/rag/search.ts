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
  document_name: string;
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
    console.error(`[RAG] search: failed to load ready documents: ${readyError.message}`);
    throw new Error(`Failed to load ready documents: ${readyError.message}`);
  }

  const readyDocumentIds = (readyDocuments ?? []).map((document) => document.id as string);
  console.log(
    `[RAG] search: query=${JSON.stringify(query.slice(0, 80))} readyDocuments=${readyDocumentIds.length}`
  );
  if (readyDocumentIds.length === 0) {
    // Genuinely nothing indexed yet — this is the ONE legitimate reason to get
    // zero matches. Any other zero-match case below is a bug worth flagging.
    console.warn("[RAG] search: no completed documents to search — returning 0 matches");
    return [];
  }

  const embedStart = Date.now();
  const queryEmbedding = await embedQuery(query);
  console.log(`[RAG] embed: dims=${queryEmbedding.length} in ${Date.now() - embedStart}ms`);

  const searchStart = Date.now();
  const { data, error } = await supabase.rpc("match_documents", {
    query_embedding: queryEmbedding,
    match_count: matchCount,
    filter_document_ids: readyDocumentIds,
  });

  if (error) {
    console.error(`[RAG] vector search FAILED: ${error.message}`);
    throw new Error(`Vector search failed: ${error.message}`);
  }

  const matches = (data ?? []) as Omit<DocumentChunkMatch, "document_name">[];
  const topSimilarity = matches[0]?.similarity;
  console.log(
    `[RAG] vector search: matches=${matches.length} top=${
      topSimilarity != null ? `${(topSimilarity * 100).toFixed(1)}%` : "n/a"
    } in ${Date.now() - searchStart}ms`
  );
  if (matches.length === 0) {
    // We already confirmed completed documents exist, so an empty result here
    // means the ANN index failed to surface any neighbour (e.g. an oversized
    // ivfflat `lists` value probing an empty cell). See the index note in
    // schema.sql — the fix is to drop the premature index so this becomes an
    // exact scan.
    console.warn(
      "[RAG] vector search returned 0 rows despite completed documents existing — " +
        "likely a vector index problem (see schema.sql index note)"
    );
    return [];
  }

  // match_documents only returns document_id, not the file name, so resolve
  // names for the (usually small) set of matched documents in one follow-up
  // query — needed for source attribution in the conversation history.
  const uniqueDocumentIds = [...new Set(matches.map((match) => match.document_id))];
  const { data: matchedDocuments, error: namesError } = await supabase
    .from("documents")
    .select("id, file_name")
    .in("id", uniqueDocumentIds);

  if (namesError) {
    throw new Error(`Failed to resolve matched document names: ${namesError.message}`);
  }

  const nameById = new Map(
    (matchedDocuments ?? []).map((document) => [document.id as string, document.file_name as string])
  );

  return matches.map((match) => ({
    ...match,
    document_name: nameById.get(match.document_id) ?? "Unknown document",
  }));
}
