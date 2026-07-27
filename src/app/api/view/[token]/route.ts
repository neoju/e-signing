import { NextRequest, NextResponse } from "next/server";
import { verifyPassword } from "@/lib/password";
import { computeLockedUntil, lockRemainingMs } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Field } from "@/types/pdf-editor";

const SIGNED_URL_TTL_SECONDS = 60 * 15;

type ShareRow = {
  id: string;
  title: string;
  original_path: string;
  fields: Field[];
  status: string;
  share_enabled: boolean;
  share_password_hash: string | null;
  share_failed_attempts: number;
  share_locked_until: string | null;
};

type IpAttempts = {
  failed_attempts: number;
  locked_until: string | null;
};

async function loadShareableRow(token: string) {
  const supabase = createSupabaseAdminClient();
  const { data: row } = await supabase
    .from("signature_requests")
    .select(
      "id, title, original_path, fields, status, share_enabled, share_password_hash, share_failed_attempts, share_locked_until",
    )
    .eq("token", token)
    .maybeSingle<ShareRow>();

  if (!row || row.status !== "draft" || !row.share_enabled) return null;
  return { row, supabase };
}

async function loadIpAttempts(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  token: string,
  ip: string,
): Promise<IpAttempts> {
  const { data } = await supabase
    .from("share_password_attempts")
    .select("failed_attempts, locked_until")
    .eq("token", token)
    .eq("ip", ip)
    .maybeSingle<IpAttempts>();
  return data ?? { failed_attempts: 0, locked_until: null };
}

async function buildPayload(row: ShareRow, supabase: ReturnType<typeof createSupabaseAdminClient>) {
  const { data: urlData } = await supabase.storage
    .from("documents")
    .createSignedUrl(row.original_path, SIGNED_URL_TTL_SECONDS);
  return {
    title: row.title,
    fields: row.fields,
    pdfUrl: urlData?.signedUrl ?? null,
    requiresPassword: false as const,
  };
}

// Public, unauthenticated: checks whether the link is live and whether a
// password is required, without leaking document contents until unlocked.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const loaded = await loadShareableRow(token);
  if (!loaded) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const { row, supabase } = loaded;
  if (row.share_password_hash) {
    return NextResponse.json({ requiresPassword: true });
  }
  return NextResponse.json(await buildPayload(row, supabase));
}

// Public, unauthenticated: submits a password for a protected share link.
// Rate-limited on two dimensions with exponential backoff (see
// `src/lib/rate-limit.ts`): per-share (via columns on signature_requests)
// and per-(share, IP) (via the share_password_attempts table). A request
// is throttled when *either* dimension is locked; both counters reset on a
// correct password.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const loaded = await loadShareableRow(token);
  if (!loaded) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const { row, supabase } = loaded;

  if (!row.share_password_hash) {
    return NextResponse.json(await buildPayload(row, supabase));
  }

  const clientIp = getClientIp(req);
  const ipAttempts = clientIp
    ? await loadIpAttempts(supabase, token, clientIp)
    : null;

  const remainingMs = Math.max(
    lockRemainingMs(row.share_locked_until),
    lockRemainingMs(ipAttempts?.locked_until),
  );
  if (remainingMs > 0) {
    const retryAfter = Math.max(1, Math.ceil(remainingMs / 1000));
    return NextResponse.json(
      { error: "Too many attempts, try again later" },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }

  const body = await req.json().catch(() => null);
  const password = typeof body?.password === "string" ? body.password : "";
  const passwordOk = Boolean(password) && verifyPassword(password, row.share_password_hash);

  if (!passwordOk) {
    const nextTokenAttempts = row.share_failed_attempts + 1;
    await supabase
      .from("signature_requests")
      .update({
        share_failed_attempts: nextTokenAttempts,
        share_locked_until: computeLockedUntil(nextTokenAttempts),
      })
      .eq("id", row.id);

    if (clientIp && ipAttempts) {
      const nextIpAttempts = ipAttempts.failed_attempts + 1;
      await supabase.from("share_password_attempts").upsert(
        {
          token,
          ip: clientIp,
          failed_attempts: nextIpAttempts,
          locked_until: computeLockedUntil(nextIpAttempts),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "token,ip" },
      );
    }

    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  // Reset the per-token counters only if they're non-zero — avoids a
  // needless write on the common (already-unlocked, correct-password) path.
  if (row.share_failed_attempts > 0 || row.share_locked_until) {
    await supabase
      .from("signature_requests")
      .update({ share_failed_attempts: 0, share_locked_until: null })
      .eq("id", row.id);
  }
  // Drop the per-IP row on success so the table doesn't accumulate stale
  // entries for the (many) IPs that eventually got the password right.
  if (clientIp && ipAttempts && (ipAttempts.failed_attempts > 0 || ipAttempts.locked_until)) {
    await supabase
      .from("share_password_attempts")
      .delete()
      .eq("token", token)
      .eq("ip", clientIp);
  }

  return NextResponse.json(await buildPayload(row, supabase));
}
