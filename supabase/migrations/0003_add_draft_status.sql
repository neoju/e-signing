-- SignZ: allow a 'draft' status on signature_requests.
--
-- Drafts are documents a signed-in user has started editing and saved for
-- later, before (or without ever) sending them for signature. They reuse
-- the same table/storage layout as sent requests: original_path holds the
-- in-progress PDF, fields holds the in-progress field placements, and
-- owner_email (added in 0002) is required for drafts (enforced at the API
-- layer, not the DB layer) since only signed-in users can save one.
--
-- Apply this in the Supabase SQL editor (or via `supabase db push`).

alter table public.signature_requests
  drop constraint if exists signature_requests_status_check;

alter table public.signature_requests
  add constraint signature_requests_status_check
  check (status in ('draft', 'pending', 'completed'));
