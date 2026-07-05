# Phase 32 — Implement document deletion

Implement the DELETE /api/documents/[id] route: delete the document's row (cascading to its chunks), remove the file from Supabase Storage, and wire up the delete icon in the document library component to call this route with an optimistic UI update.
