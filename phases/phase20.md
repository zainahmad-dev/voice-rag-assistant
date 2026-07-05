# Phase 20 — Build the ingest API route

Implement the /api/ingest API route: given a document id, download the file from Supabase Storage, extract its text, chunk it, generate embeddings for every chunk, insert the chunks and embeddings into the document_chunks table in batches, then update the document's status to 'ready' with its chunk count — or to 'failed' with an error message if any step throws.
