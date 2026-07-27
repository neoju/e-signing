-- Audit trail for signature requests: sent / viewed / signed events, each
-- capturing the actor's IP address and user agent. Apply manually via the
-- Supabase SQL editor, like the other migrations.

create table if not exists public.signature_request_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.signature_requests(id) on delete cascade,
  event_type text not null check (event_type in ('sent', 'viewed', 'signed')),
  actor text not null check (actor in ('sender', 'recipient')),
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists signature_request_events_request_id_idx
  on public.signature_request_events (request_id, created_at);

-- RLS: deny all direct access, same as signature_requests — only the
-- service role (used exclusively in server route handlers) can read/write.
alter table public.signature_request_events enable row level security;
