import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

// Cap uploaded PDFs (original + signed) at 20 MB. Enforced by every route
// handler that accepts a `file` form part; the browser also refuses to
// load anything larger from the Uploader so we don't waste an upload round
// trip in the common case.
export const MAX_PDF_BYTES = 20 * 1024 * 1024;
export const MAX_PDF_MB = 20;

// Returns a 413 response when the parsed multipart `file` exceeds the cap,
// otherwise null. Call this right after asserting `file instanceof Blob`.
export function pdfTooLarge(file: Blob): NextResponse | null {
  if (file.size > MAX_PDF_BYTES) {
    return NextResponse.json(
      { error: `PDF is too large (max ${MAX_PDF_MB} MB)` },
      { status: 413 },
    );
  }
  return null;
}

// Rolling 24h upload cap for `POST /api/documents/send` (see migration 0009).
// Guests are keyed by IP with a low cap; signed-in users are keyed by email
// with a higher cap. Guests behind a proxy that strips forwarded headers
// share the "unknown" bucket, so a misconfigured deployment fails closed
// (i.e. still throttled) instead of granting anyone unlimited uploads.
export const GUEST_DAILY_UPLOAD_LIMIT = 3;
export const USER_DAILY_UPLOAD_LIMIT = 10;
const UPLOAD_WINDOW_MS = 24 * 60 * 60 * 1000;

export type UploadQuotaScope = "ip" | "email";

export interface UploadQuota {
  scope: UploadQuotaScope;
  key: string;
  limit: number;
}

// Picks the right (scope, key, limit) tuple for a given request. Pass
// `email = null` for anonymous requests; `ip` should already be normalized
// via `getClientIp` (which may itself return null).
export function resolveUploadQuota(email: string | null, ip: string | null): UploadQuota {
  if (email) {
    return { scope: "email", key: email.toLowerCase(), limit: USER_DAILY_UPLOAD_LIMIT };
  }
  return { scope: "ip", key: ip ?? "unknown", limit: GUEST_DAILY_UPLOAD_LIMIT };
}

// Returns a 429 response if the caller has already hit their 24h cap,
// otherwise null. Call this *before* doing any storage/DB writes so a
// throttled request doesn't leave orphaned rows/objects behind. On DB
// failure we fail open (return null) rather than block legitimate uploads,
// matching the "best effort" spirit of the share-password IP limiter.
export async function checkUploadQuota(
  supabase: SupabaseClient,
  quota: UploadQuota,
): Promise<NextResponse | null> {
  const since = new Date(Date.now() - UPLOAD_WINDOW_MS).toISOString();
  const { count, error } = await supabase
    .from("document_upload_attempts")
    .select("id", { count: "exact", head: true })
    .eq("scope", quota.scope)
    .eq("key", quota.key)
    .gt("created_at", since);

  if (error) {
    console.error("checkUploadQuota failed", error);
    return null;
  }
  if ((count ?? 0) < quota.limit) return null;

  return NextResponse.json(
    {
      error:
        quota.scope === "email"
          ? `Daily upload limit reached (${quota.limit} per 24h). Try again later.`
          : `Daily upload limit reached (${quota.limit} per 24h). Sign in to raise the cap.`,
    },
    {
      status: 429,
      headers: { "Retry-After": String(Math.ceil(UPLOAD_WINDOW_MS / 1000)) },
    },
  );
}

// Records a successful upload against the 24h counter. Called *after* the
// row insert commits so failed uploads don't burn quota. Errors are logged
// and swallowed — the user's upload already succeeded, and a missed counter
// row is preferable to surfacing a spurious 500.
export async function recordUploadAttempt(
  supabase: SupabaseClient,
  quota: UploadQuota,
): Promise<void> {
  const { error } = await supabase
    .from("document_upload_attempts")
    .insert({ scope: quota.scope, key: quota.key });
  if (error) {
    console.error("recordUploadAttempt failed", error);
  }
}
