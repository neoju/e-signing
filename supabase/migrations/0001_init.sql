-- SignFlow: signature requests + storage (no auth / no accounts)
-- Apply this in the Supabase SQL editor (or via `supabase db push`).
--
-- There is no user identity in this app. All reads/writes happen server-side
-- through Next.js route handlers using the Supabase service-role key, which
-- bypasses RLS. RLS is enabled below with no permissive policies, so the
-- anon/authenticated roles (which this app never uses) have zero access.

-- Extensions
create extension if not exists pgcrypto;

-- Table
create table if not exists public.signature_requests (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  original_path text not null,
  signed_path text,
  token text unique not null,
  status text not null default 'pending' check (status in ('pending', 'completed')),
  fields jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists signature_requests_created_at_idx
  on public.signature_requests (created_at desc);

-- RLS: deny all direct access. Only the service role (used exclusively in
-- server route handlers) can read/write this table.
alter table public.signature_requests enable row level security;

-- Public sign flow: fetch a pending request by its token.
create or replace function public.get_request_by_token(t text)
returns table (
  id uuid,
  title text,
  original_path text,
  fields jsonb,
  status text
)
language sql
security definer
set search_path = public
as $$
  select r.id, r.title, r.original_path, r.fields, r.status
  from public.signature_requests r
  where r.token = t
    and r.status = 'pending';
$$;

-- Complete a pending request by writing the signed_path and merging filled
-- values back into the fields jsonb.
create or replace function public.complete_request(
  t text,
  p_signed_path text,
  p_fields jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  req_id uuid;
begin
  update public.signature_requests
    set signed_path = p_signed_path,
        fields = p_fields,
        status = 'completed',
        completed_at = now()
    where token = t
      and status = 'pending'
    returning id into req_id;

  if req_id is null then
    raise exception 'request not found or already completed';
  end if;

  return req_id;
end;
$$;

-- These RPCs are only ever called with the service-role client from server
-- route handlers, so no execute grants to anon/authenticated are needed.

-- Storage bucket for original + signed PDFs (private). No storage.objects
-- policies are added — the service role bypasses RLS, and no other role
-- ever touches this bucket directly.
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;
