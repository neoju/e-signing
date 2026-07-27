-- Per-(token, IP) counters for `POST /api/view/[token]`, complementing the
-- per-token columns added in 0007. The same exponential-backoff schedule
-- applies to both; a request is throttled when *either* limit is locked.
-- Apply this in the Supabase SQL editor.

create table if not exists public.share_password_attempts (
  token text not null,
  ip text not null,
  failed_attempts integer not null default 0,
  locked_until timestamptz,
  updated_at timestamptz not null default now(),
  primary key (token, ip)
);

create index if not exists share_password_attempts_locked_until_idx
  on public.share_password_attempts (locked_until)
  where locked_until is not null;

-- RLS: deny all direct access — the service role (used exclusively in
-- server route handlers) bypasses it.
alter table public.share_password_attempts enable row level security;
