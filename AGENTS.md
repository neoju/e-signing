# AGENTS.md

SignFlow — a Next.js 15 (App Router) app that lets a user upload a PDF, place
signature/text/date fields on it, and either export a signed PDF locally or
send a link so someone else can fill it in and sign. There are **no user
accounts/auth anywhere** — the "send for signature" flow is backed by
Supabase (Postgres + Storage), but all rendering, field placement, and PDF
composition still happen entirely client-side in the browser; only the
upload/share/complete steps touch the server.

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

## Signature request flow (Supabase, no auth)

- No accounts, no login, no cookies. The browser never talks to Supabase
  directly; every DB/Storage operation goes through a Next.js route handler
  using `src/lib/supabase/admin.ts` (service-role key). RLS on
  `signature_requests` and the `documents` storage bucket is enabled with
  **no permissive policies**, so only the service role can read/write —
  losing that key is the only way to leak data.
- Schema/RPCs live in `supabase/migrations/0001_init.sql` (apply manually via
  the Supabase SQL editor): `signature_requests` table (keyed by a random
  `token`, no `owner_id`), `get_request_by_token(t)`, and
  `complete_request(t, signed_path, fields)`.
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
  `src/app/api/requests/route.ts`, which uploads the original PDF to
  Storage (`documents/{id}/original.pdf`) and inserts a row — it 400s if no
  `"recipient"` field is present. The returned `{ id, token }` is stashed in
  the browser's `localStorage` (`src/lib/sent-requests.ts`) — there is no
  server-side list of "my requests", so `/requests`
  (`src/app/requests/page.tsx`) only shows what this browser remembers,
  polling `GET /api/requests/[id]` for status.
- Signer flow: `/sign/[token]` (`src/app/sign/[token]/page.tsx`) is a server
  component that looks up the row directly (service role bypasses RLS),
  404s if missing, shows an "already signed" screen if `status=completed`,
  otherwise generates a short-lived signed Storage URL and renders
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

## Path alias

`@/*` → `./src/*` (see `tsconfig.json`).
