# SignFlow

Upload a PDF, place signature/text/date fields, and either download a signed
copy immediately or send a link so someone else can fill it in and sign —
no accounts, no login.

## Setup

```bash
bun install
```

Create a Supabase project, then apply the migration in
[supabase/migrations/0001_init.sql](supabase/migrations/0001_init.sql) via the
Supabase SQL editor (or `supabase db push`). It creates the
`signature_requests` table, two RPCs (`get_request_by_token`,
`complete_request`), and a private `documents` storage bucket.

Add a `.env.local` with:

```
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service role key>
```

There is no `NEXT_PUBLIC_SUPABASE_ANON_KEY` because the browser never talks
to Supabase directly — every read/write goes through a Next.js route handler
using the service-role key. Keep `SUPABASE_SERVICE_ROLE_KEY` out of any
client-exposed code.

## Commands

- `bun run dev` — dev server
- `bun run build` — production build
- `bun run lint` — `next lint`
