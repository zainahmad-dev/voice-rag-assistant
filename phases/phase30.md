# Phase 30 — Connect upload, library, and voice end to end

Replace all remaining mock data in the dashboard with live data: the upload dropzone should call /api/upload, the document library should use the real polling hook, and the voice assistant should only be able to query documents that are marked 'ready'. Verify the full loop works: upload a file, watch it index, then ask a voice question about it.
