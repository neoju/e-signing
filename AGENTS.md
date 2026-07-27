# AGENTS.md

SignZ — a Next.js 15 (App Router) app that lets a user upload a PDF, place
signature/text/date fields on it, and either export a signed PDF locally or
send a link so someone else can fill it in and sign. The "send for signature"
flow is backed by Supabase (Postgres + Storage), but all rendering, field
placement, and PDF composition still happen entirely client-side in the
browser; only the upload/share/complete steps touch the server. **Login is
optional** (Auth.js v5, Google) — the editor and the public sign flow work
anonymously; signing in only unlocks a server-backed dashboard of your sent
requests.

## Commands

Package manager is **bun** (`bun.lock` present, no `package-lock.json`/`yarn.lock`).

- `bun install` — installs deps and runs `postinstall`, which copies
  `node_modules/pdfjs-dist/build/pdf.worker.min.mjs` to `public/pdf.worker.min.mjs`.
  If PDF rendering silently breaks (blank pages, worker 404), re-run
  `bun install` or manually re-copy that file — `public/pdf.worker.min.mjs` is
  a build artifact, not hand-maintained source.
- `bun run dev` — dev server
- `bun run build` — production build
- `bun run lint` — `next lint`

No test suite, no CI config, and no `.git` repo exists yet in this project.

## Architecture

- `src/app/page.tsx` dynamically imports `PdfEditor` with `ssr: false` — the
  editor depends on browser-only APIs (`canvas`, `pdfjs-dist` worker,
  `crypto.randomUUID`) and cannot run server-side.
- `next.config.mjs` aliases webpack's `canvas` module to `false`; this is
  required because `pdfjs-dist` optionally pulls in `canvas` for
  Node-side rendering, which must not be bundled for the browser build.
- `src/components/PdfEditor.tsx` is the core: renders PDF pages to
  `<canvas>`/data-URLs via `pdfjs-dist`, tracks placed `Field`s
  (signature/text/date) in fractional `(0..1)` page coordinates with a
  **top-left** origin, and exports via `pdf-lib`, which uses a
  **bottom-left** origin — the y-flip happens in `exportPdf()`
  (`yBottom = ph - yTop - h`). Any change to field placement/export math must
  keep both coordinate systems consistent.
- `src/components/SignatureModal.tsx` provides three ways to produce a
  signature image (draw via `react-signature-canvas`, type with a preset
  font rendered to canvas, or upload an image) — all resolve to a PNG data
  URL consumed by `PdfEditor`.
- pdfjs worker path is hardcoded as `/pdf.worker.min.mjs` in `PdfEditor.tsx`
  (`renderPdfPages`) and must match the `pdfjs-dist` version pinned in
  `package.json`; bumping `pdfjs-dist` requires re-running the postinstall
  copy step.

## Signature request flow (Supabase)

- The browser never talks to Supabase directly; every DB/Storage operation
  goes through a Next.js route handler using `src/lib/supabase/admin.ts`
  (service-role key). RLS on `signature_requests` and the `documents`
  storage bucket is enabled with **no permissive policies**, so only the
  service role can read/write — losing that key is the only way to leak
  data.
- Schema/RPCs live in `supabase/migrations/0001_init.sql` (apply manually via
  the Supabase SQL editor): `signature_requests` table (keyed by a random
  `token`), `get_request_by_token(t)`, and
  `complete_request(t, signed_path, fields)`.
- `supabase/migrations/0002_add_owner_email.sql` adds a nullable
  `owner_email` column + index. When a request is created by a logged-in
  user, `POST /api/documents/send` stamps `session.user.email` onto the row;
  anonymous POSTs leave it NULL. `GET /api/documents` is session-only and
  returns just that user's rows.
- `supabase/migrations/0003_add_draft_status.sql` widens the `status` check
  constraint to allow `'draft'` alongside `'pending'`/`'completed'` — see
  "Saving drafts" below.
- `Field.assignee` (`"sender" | "recipient"`, `src/types/pdf-editor.ts`)
  distinguishes who fills a field in. The sender fills/signs `"sender"`
  fields directly in `PdfEditor` (existing tool-placement flow, unchanged).
  Clicking "Send for signature" switches `PdfEditor` into a second mode
  (`RecipientAssignBar` replaces `TopBar`) where every field placed is
  tagged `"recipient"` and left blank — these are the areas the next signer
  must fill. `FieldBox` color-codes the two (`accent` = you, `accent2` =
  next signer).
- Sender flow: clicking "Generate link" in `RecipientAssignBar` `POST`s the
  PDF + all fields (sender values preserved, recipient values blank) to
  `src/app/api/documents/send/route.ts`, which uploads the original PDF to
  Storage (`documents/{id}/original.pdf`) and inserts a row — it 400s if no
  `"recipient"` field is present. The returned `{ id, token }` is stashed in
  the browser's `localStorage` (`src/lib/sent-requests.ts`) as a fallback,
  and if a session cookie is present the row's `owner_email` is also set.
  `/documents` (`src/app/documents/page.tsx`, titled "Your Documents" in the
  UI) is a server component that branches on `auth()`: logged in →
  server-fetch by `owner_email` (cross-device, `RequestsListOwned`); logged
  out → localStorage fallback (per-browser) rendered by
  `RequestsListLocal`, plus a "sign in to sync" banner.
- Signer flow: `/sign/[token]` (`src/app/sign/[token]/page.tsx`) is a server
  component that looks up the row directly (service role bypasses RLS),
  404s if missing, shows an "already signed" screen if `status=completed`,
  **404s for any other status (including `'draft'`) — critical, since a
  draft's `token` will be reused by the read-only view/share flow and
  serving it here would bypass any share password**, otherwise generates a
  short-lived signed Storage URL and renders
  `SignPdfClient`, which reuses `renderPdfPages`/`buildSignedPdfBytes`
  (extracted in `src/lib/pdf-export.ts`) and a read-only-position variant of
  the field UI (`src/components/sign/`). `SignFieldBox` renders `"sender"`
  fields as plain read-only overlays (so the recipient can see the sender's
  signature/answers) and only `"recipient"` fields as editable — the
  "submit" button is only enabled once every `"recipient"` field has a
  value. On submit it builds the final PDF client-side (baking in *all*
  fields, both signers) and `POST`s it to
  `src/app/api/sign/[token]/complete/route.ts`, which uploads
  `documents/{id}/signed.pdf` and calls `complete_request`.

## Styling

- Design tokens (`bg`, `panel`, `border`, `muted`, `text`, `accent`,
  `accent2`) are defined in `tailwind.config.ts` — use these instead of raw
  colors.
- Shared component classes (`.btn-primary`, `.btn-ghost`, `.card`,
  `.signature-canvas`) live in `src/app/globals.css`; prefer them over
  duplicating Tailwind utility strings.
- Fonts (Inter, Instrument Serif, Great Vibes, Dancing Script) are loaded via
  a Google Fonts `@import` in `globals.css`. The signature "type" tab in
  `SignatureModal.tsx` depends on these exact font families being loaded —
  keep the two in sync if fonts change.

## Saving drafts

- Signed-in users can save the document they're currently editing without
  sending it — the `Save` button in `TopBar` (hidden state logic lives in
  `PdfEditor`: a `dirty` flag flips true on any field mutation and resets on
  load/save, driving the button's enabled state and "Save"/"Saved" label).
- `POST /api/documents` (`src/app/api/documents/route.ts`) creates a new
  `signature_requests` row with `status: "draft"` (no `"recipient"` field
  required, unlike `/api/documents/send`). `PATCH /api/documents/[id]`
  overwrites an existing draft's PDF/fields/title in place (`upsert` on the
  same storage path) — both require a session and, for `PATCH`, that
  `owner_email` matches and `status` is still `"draft"`.
- `PdfEditor` tracks `draftId`; the first successful save creates the row
  and rewrites the URL to `/?draft={id}` via `router.replace` (no reload) so
  a refresh resumes editing the same draft; subsequent saves `PATCH` it.
- `GET /api/documents/[id]` (`src/app/api/documents/[id]/route.ts`) serves
  two audiences from one handler: anyone holding the (unguessable) id gets a
  lightweight `{ id, title, token, status, signedUrl }` status payload —
  this is what `RequestsListLocal` polls for both logged-in and anonymous
  senders — while the signed-in owner of a still-`"draft"` row additionally
  gets `fields`/`pdfUrl` so the editor can resume it; non-owners get 404 for
  a `"draft"` row instead of the status payload, since draft content is
  private. `PdfEditor` reads a `?draft=` query param on mount
  (`src/app/page.tsx` wraps it in `<Suspense>` for `useSearchParams`),
  fetches that PDF, and rebuilds a `File` from the bytes so the rest of the
  editor is unaware it didn't come from a local upload. `RequestsListOwned`
  renders `"draft"` rows with a "Draft" badge and a pencil button linking to
  `/?draft={id}`.
- Saving requires sign-in (there's no anonymous identity to key a draft on).
  If `PdfEditor` calls `saveDraft()` while logged out (or a save 401s
  because the session expired), it shows an "Sign in to save" modal instead
  of silently failing — signing in is a full OAuth redirect, so current
  in-memory edits are lost, which the modal calls out explicitly.

## Draft sharing (read-only view)

- `supabase/migrations/0005_add_draft_sharing.sql` adds share fields to
  `signature_requests` (`share_enabled`, `share_password_hash`) plus the
  per-token brute-force counter columns
  (`share_failed_attempts`, `share_locked_until`). Password hashes are
  scrypt-based (`src/lib/password.ts`) — no external hashing dependency.
- `POST /api/documents/[id]/share` (owner-only, session-gated) toggles
  sharing and stores/clears the hashed password. `POST /api/view/[token]`
  verifies a submitted password and returns a signed PDF URL + fields to
  render read-only.
- `/view/[token]` (`src/app/view/[token]/page.tsx`) is the recipient-side
  page: enter password (if set), then `ViewSharedDraftClient` renders the
  PDF pages via `renderPdfPages` and overlays every field as read-only
  (`ViewFieldBox`/`ViewPageCanvas`). No editing, no submit — this is a
  view-only link, distinct from `/sign/[token]` (which requires the row
  to be in `pending`/`completed` status).
- Rate limiting is two-layered so neither a single-token guessing loop nor
  a distributed one can burn through the password: `0007` adds the
  per-token counter (columns above) and `0008` adds a per-IP counter
  (`share_password_attempts` table, keyed by `(token, ip)`).
  `src/lib/rate-limit.ts` shares the exponential-backoff schedule
  (`MAX_FREE_ATTEMPTS=5`, `BASE_LOCK_SECONDS=15`, `MAX_LOCK_SECONDS=15min`)
  between both limits so the two behave identically; a request is throttled
  when *either* limit is locked. `src/lib/request-ip.ts` extracts the
  client IP (`x-forwarded-for` first, `x-real-ip` fallback).
- Editor UI: `TopBar` gains a Share button that calls `openShare` on
  `PdfEditor` — if the current document is dirty or has never been saved,
  it saves a draft first, then opens `ShareDraftModal` for that
  `documentId`. The dashboard's `RequestsListOwned` renders a Share button
  next to the pencil on draft rows.

## Signature library

- Signed-in users can save signatures (drawn/typed/uploaded PNG data URLs)
  and reuse them across documents instead of redrawing every time.
  `supabase/migrations/0004_add_signatures.sql` adds a `signatures` table
  (`owner_email`, `name`, `image_data_url`, `is_default`) — images are
  stored directly as `text` (no storage bucket) since they're small.
  `src/types/signature.ts` defines the client-facing `SavedSignature` shape.
- `src/app/api/signatures/route.ts` (`GET`/`POST`) and
  `src/app/api/signatures/[id]/route.ts` (`PATCH`/`DELETE`) are all
  session-gated and ownership-checked, following the same pattern as
  `/api/documents`. Saving the *first* signature (or passing
  `isDefault: true`) unsets any previous default for that `owner_email`
  first — only one signature can be default at a time.
- `src/components/SignatureModal.tsx` grew a `variant` prop: `"editor"`
  (default, used from `PdfEditor`) adds a "Saved" tab (fetched from
  `GET /api/signatures`) to pick an existing signature, plus a "Save to my
  signatures for next time" checkbox on the Draw/Type/Upload tabs;
  `"library"` (used from the manage page) always saves and skips the
  "Saved" tab. Either way `onConfirm(dataUrl)` fires the same way regardless
  of source, so callers don't need to know which tab was used.
- `src/app/signatures/page.tsx` ("Your Signatures", linked from
  `AuthMenu`) renders `src/components/signatures/SignatureManager.tsx` — a
  grid of saved signatures with rename/set-default/delete actions and an
  "Add signature" card that opens `SignatureModal` in `"library"` mode.
- `PdfEditor` fetches `GET /api/signatures` on session change and preloads
  the default (or first) signature into `savedSig` so placing a signature
  field skips the modal entirely.

## Audit log

- `supabase/migrations/0006_add_audit_log.sql` adds an `audit_log` table
  keyed by `request_id` with `event_type` ('sent' / 'viewed' / 'signed'),
  `actor` ('sender' / 'recipient'), plus `ip_address`, `user_agent`, and
  `created_at`. `src/types/audit-log.ts` mirrors that shape client-side.
- `src/lib/audit-log.ts` exposes `recordAuditEvent(supabase, {...})` — a
  thin insert wrapper. All callers pass IP + UA extracted with
  `src/lib/request-ip.ts` (`getClientIp`) from the incoming `NextRequest`.
- Events are recorded at three points: `POST /api/documents/send` logs
  `'sent'` right after the row is inserted (the "start" of the trail); a
  dedicated `POST /api/sign/[token]/view/route.ts`, fired from a mount
  `useEffect` in `SignPdfClient`, logs `'viewed'` the moment the recipient
  opens the document (no-ops if the token is unknown or already completed);
  `POST /api/sign/[token]/complete/route.ts` logs `'signed'` right after
  `complete_request` succeeds.
- `GET /api/documents/[id]/audit/route.ts` returns the ordered event list
  for a request. Like the status payload from `GET /api/documents/[id]`,
  it's unauthenticated but keyed by the unguessable `id` — the same trust
  model lets both signed-in and anonymous senders view their own log.
- `src/components/requests/AuditLogModal.tsx` renders the timeline (fetched
  on open) with `src/lib/user-agent.ts` (`describeUserAgent`) turning the raw
  UA string into a short label (e.g. "Chrome on macOS") next to the IP and
  timestamp — a small hand-rolled regex sniffer, no parsing dependency. It's
  opened via a `History` icon button in `RequestsListOwned` and
  `RequestsListLocal` for any row that has actually been sent (`pending` or
  `completed`, not `draft`).

## Upload size limit

- `src/lib/upload-limits.ts` caps PDFs at **20 MB** (`MAX_PDF_BYTES`).
  Every route handler that accepts a `file` form part
  (`/api/documents`, `/api/documents/[id]`, `/api/documents/send`,
  `/api/sign/[token]/complete`) calls `pdfTooLarge(file)` right after
  asserting `file instanceof Blob` and short-circuits with a 413.
- Client mirrors the check: `PdfEditor.loadFile` (used by both the file
  picker and the drag-drop handler) rejects too-large files up front with
  an alert, and `Uploader` advertises "max 20 MB" so the number stays in
  sync. Server responses on 413 flow into the existing
  `sendError`/`saveError` states via each caller's `data?.error` fallback.

## Auth (optional)

- Auth.js v5 (`next-auth@beta`), configured in `src/auth.ts` with a Google
  provider and **JWT sessions** (no DB adapter, no new tables). The
  session cookie carries the provider `email`, which is the only identity
  the rest of the app uses (`owner_email` on `signature_requests`).
- `src/app/api/auth/[...nextauth]/route.ts` re-exports the handlers.
  `src/middleware.ts` registers the `auth` middleware app-wide (so the
  session cookie is refreshed) but gates nothing — login is optional
  everywhere.
- Env vars: `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` (see
  `README.md`).
- `src/app/login/page.tsx` is a server component with a `signIn(...)`
  server action (Google). There is no separate register page — first OAuth
  sign-in is registration. `src/components/AuthMenu.tsx` is a client
  component always rendered as a dropdown (avatar+email when signed in, a
  generic user icon when signed out) containing a "Your Documents" link
  (`/documents`) plus "Sign in"/"Sign out"; it's mounted in `TopBar` and in
  the `Uploader` header and on `/documents`. The `SessionProvider` from
  `next-auth/react` is wired in `src/app/layout.tsx` via
  `src/components/AuthSessionProvider.tsx`.
- `src/types/next-auth.d.ts` narrows `session.user.email` to
  non-nullable `string` for the rest of the codebase.

## Path alias

`@/*` → `./src/*` (see `tsconfig.json`).
