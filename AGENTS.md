# AGENTS.md

SignFlow — a single-page Next.js 15 (App Router) app that lets a user upload a
PDF, place signature/text/date fields on it, and export a signed PDF. There is
**no backend**: everything (rendering, editing, signing, export) happens
client-side in the browser.

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
