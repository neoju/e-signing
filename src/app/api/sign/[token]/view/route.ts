import { NextRequest, NextResponse } from "next/server";
import { recordAuditEvent } from "@/lib/audit-log";
import { getClientIp } from "@/lib/request-ip";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// Fired by SignPdfClient on mount to record that the recipient opened the
// document. Best-effort and silent: an unknown/already-completed token just
// no-ops rather than erroring, since this isn't on the critical sign path.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const supabase = createSupabaseAdminClient();

  const { data: row } = await supabase
    .from("signature_requests")
    .select("id, status")
    .eq("token", token)
    .maybeSingle();

  if (row && row.status === "pending") {
    await recordAuditEvent(supabase, {
      requestId: row.id,
      eventType: "viewed",
      actor: "recipient",
      ipAddress: getClientIp(req),
      userAgent: req.headers.get("user-agent"),
    });
  }

  return NextResponse.json({ ok: true });
}
