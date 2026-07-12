-- Voice-Enabled RAG Document Assistant — Supabase schema
-- Run this once in the Supabase SQL editor (see instructions at the bottom of this file).

-- 1. Enable the pgvector extension (needed for the `vector` column type and similarity search).
create extension if not exists vector;

-- 2. Documents table — one row per uploaded file.
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  file_type text not null,
  storage_path text not null,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'completed', 'failed')),
  error_message text,
  chunk_count integer not null default 0,
  created_at timestamptz not null default now()
);

-- 3. Document chunks table — one row per embedded chunk of a document.
create table if not exists document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents (id) on delete cascade,
  chunk_index integer not null,
  content text not null,
  embedding vector(768), -- 768 dimensions matches Google's Gemini text-embedding-004
  created_at timestamptz not null default now()
);

-- 4. No ANN index on `embedding` for now — an IVFFlat/HNSW index only pays off once
-- there's enough data for approximate search to matter (IVFFlat needs roughly
-- sqrt(row_count) lists to have any accuracy; with the small chunk counts this app
-- starts with, an oversized `lists` setting makes the index return WORSE matches
-- than a plain sequential scan, silently dropping the correct document from
-- results). match_documents() below just does `order by embedding <=> query_embedding`
-- with no index, which Postgres executes as an exact sequential scan — correct, and
-- fast enough for tens of thousands of rows. Only add an ivfflat/hnsw index (and
-- re-tune `lists` to roughly sqrt(row_count)) once the corpus is large enough that
-- sequential scan is measurably slow.
drop index if exists document_chunks_embedding_idx;

create index if not exists document_chunks_document_id_idx
  on document_chunks (document_id);

-- 5. match_documents — similarity search RPC used by the query API route.
-- `filter_document_ids` is optional: pass null (or omit it) to search across all documents,
-- or an array of document ids to restrict the search to a subset.
create or replace function match_documents (
  query_embedding vector(768),
  match_count int default 5,
  filter_document_ids uuid[] default null
)
returns table (
  id uuid,
  document_id uuid,
  content text,
  chunk_index int,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    document_chunks.id,
    document_chunks.document_id,
    document_chunks.content,
    document_chunks.chunk_index,
    1 - (document_chunks.embedding <=> query_embedding) as similarity
  from document_chunks
  where filter_document_ids is null
     or document_chunks.document_id = any (filter_document_ids)
  order by document_chunks.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- 6. Storage bucket for the original uploaded files. Private (`public = false`) —
-- files are only readable via the service role key (server-side) or a signed URL.
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

-- 7. Row Level Security — permissive policies suitable for this single-tenant demo.
-- Every request (anon or authenticated) is treated as the one trusted user, so
-- each policy simply allows every operation. Tighten these if the app ever
-- becomes multi-tenant.
alter table documents enable row level security;
alter table document_chunks enable row level security;

drop policy if exists "Allow all access to documents" on documents;
create policy "Allow all access to documents"
  on documents
  for all
  using (true)
  with check (true);

drop policy if exists "Allow all access to document_chunks" on document_chunks;
create policy "Allow all access to document_chunks"
  on document_chunks
  for all
  using (true)
  with check (true);

-- 8. Grants — this project's default privileges only cover REFERENCES/TRIGGER/TRUNCATE for
-- anon/authenticated/service_role, not the DML privileges PostgREST needs. RLS policies only
-- filter rows a role is already allowed to touch, so without these grants every request fails
-- with "permission denied for table ..." regardless of the policies above.
grant select, insert, update, delete on documents to anon, authenticated, service_role;
grant select, insert, update, delete on document_chunks to anon, authenticated, service_role;
grant execute on function match_documents(vector, int, uuid[]) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- How to run this in Supabase
-- ---------------------------------------------------------------------------
-- 1. Open your project at https://supabase.com/dashboard.
-- 2. In the left sidebar, click "SQL Editor" → "New query".
-- 3. Paste the entire contents of this file into the editor.
-- 4. Click "Run" (or press Ctrl/Cmd + Enter).
-- 5. Check the "Table Editor" to confirm `documents` and `document_chunks` now exist,
--    check "Database" → "Functions" to confirm `match_documents` was created, and
--    check "Storage" to confirm the private `documents` bucket was created.
-- You can re-run this file safely later — every statement uses `if not exists`,
-- `or replace`, `on conflict do nothing`, or `drop ... if exists` first, so it
-- won't error out on objects that already exist.
--
-- Note on RLS vs. grants: the service role key bypasses RLS policies, but it does NOT
-- bypass base table grants — those are a separate privilege layer that PostgREST checks
-- first. Both the service role (used server-side by this app's API routes) and the anon
-- key (used if a client component ever queries these tables directly) need the explicit
-- grants in step 8 above; without them every request fails with "permission denied for
-- table ..." even though the RLS policies would otherwise allow it.
