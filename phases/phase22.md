# Phase 22 — Build the vector search function

Implement a retrieval function that takes a user's question, embeds it using the same Gemini embedding model used for documents, and calls the Supabase match_documents RPC function to return the top matching chunks, optionally filtered to specific document ids.
