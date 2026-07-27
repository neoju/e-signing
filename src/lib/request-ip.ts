import type { NextRequest } from "next/server";

// Best-effort client IP extraction behind a reverse proxy (Vercel, etc.) —
// `x-forwarded-for` may contain a comma-separated chain of proxy hops, so we
// take the first (originating client). Falls back to `x-real-ip`, then null
// when neither header is present (e.g. local dev without a proxy).
export function getClientIp(req: NextRequest): string | null {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip");
}
