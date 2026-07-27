-- SignZ: optional read-only sharing for draft documents.
--
-- A signed-in owner can turn on a public "view" link for a draft
-- (reusing the row's existing unique `token`, which otherwise sits unused
-- until the draft is sent for signature) and optionally require a password.
-- The link only ever works while `status = 'draft'` and `share_enabled =
-- true`; sending the document for signature or disabling sharing revokes it.

alter table public.signature_requests
  add column if not exists share_enabled boolean not null default false,
  add column if not exists share_password_hash text;
