-- Per-share rate-limit state for `POST /api/view/[token]` password checks.
-- The route enforces an exponential backoff based on `share_failed_attempts`
-- and `share_locked_until`; resetting to (0, null) happens on successful
-- verification. Apply this in the Supabase SQL editor.

alter table public.signature_requests
  add column if not exists share_failed_attempts integer not null default 0,
  add column if not exists share_locked_until timestamptz;
