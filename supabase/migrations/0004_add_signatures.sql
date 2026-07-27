-- SignZ: saved signature library.
--
-- Lets a signed-in user save one or more signatures (drawn, typed, or
-- uploaded) and reuse them across documents instead of redrawing every
-- time. Signatures are small PNG data URLs stored directly as text — no
-- storage bucket needed. Like everything else, only the service role can
-- read/write this table (RLS enabled, no permissive policies); the app
-- enforces ownership (owner_email) at the API layer.

create table if not exists public.signatures (
  id uuid primary key default gen_random_uuid(),
  owner_email text not null,
  name text not null default 'Signature',
  image_data_url text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists signatures_owner_email_idx
  on public.signatures (owner_email);

alter table public.signatures enable row level security;
