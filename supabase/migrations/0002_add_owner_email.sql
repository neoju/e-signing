-- SignZ: add optional owner_email to signature_requests.
--
-- Login is optional (Auth.js v5 with Google, JWT sessions). When a
-- request is created by a logged-in user we stamp their provider email onto
-- the row so /requests can list "their" requests server-side. Anonymous
-- requests keep working and leave this column NULL.
--
-- Apply this in the Supabase SQL editor (or via `supabase db push`).

alter table public.signature_requests
  add column if not exists owner_email text;

create index if not exists signature_requests_owner_email_idx
  on public.signature_requests (owner_email);
