# Phase 16 — Build the upload API route

Implement the /api/upload API route: accept a multipart file upload, validate the file type (pdf, docx, txt) and size (max 15MB), upload the raw file to the Supabase Storage 'documents' bucket, insert a row into the documents table with status 'processing', and return the created document record.
