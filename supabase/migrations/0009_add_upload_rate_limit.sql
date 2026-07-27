-- Rolling 24h upload cap for `POST /api/documents/send` (the only upload
-- endpoint guests can hit). One row per successful upload; the route counts
-- rows in the last 24h keyed by IP (guests) or lowercased email (signed-in)
-- and rejects with 429 once the scope-specific limit is reached. Apply this
-- in the Supabase SQL editor.

create table if not exists public.document_upload_attempts (
  id bigserial primary key,
  scope text not null check (scope in ('ip', 'email')),
  key text not null,
  created_at timestamptz not null default now()
);

-- Supports the "count rows for (scope, key) in the last 24h" lookup on the
-- hot path. `created_at desc` isn't required for correctness but keeps the
-- index aligned with the query's ordering intent.
create index if not exists document_upload_attempts_scope_key_created_at_idx
  on public.document_upload_attempts (scope, key, created_at desc);

-- RLS: deny all direct access — the service role (used exclusively in
-- server route handlers) bypasses it.
alter table public.document_upload_attempts enable row level security;
