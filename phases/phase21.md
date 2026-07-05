# Phase 21 — Build document status polling

Implement a frontend hook that fetches the document list from /api/documents and automatically polls every few seconds while any document has status 'processing', stopping once all documents are 'ready' or 'failed'. Connect this hook to the document library component built earlier.
