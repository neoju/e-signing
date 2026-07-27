import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { AuditEvent } from "@/types/audit-log";

// Unauthenticated but keyed by the unguessable document id — same trust
// model as GET /api/documents/[id]'s status payload, so both logged-in and
// anonymous senders (who only have the id from localStorage) can view their
// own activity log.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createSupabaseAdminClient();

  const { data: request, error: requestError } = await supabase
    .from("signature_requests")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (requestError) {
    return NextResponse.json({ error: requestError.message }, { status: 500 });
  }
  if (!request) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("signature_request_events")
    .select("id, event_type, actor, ip_address, user_agent, created_at")
    .eq("request_id", id)
    .order("created_at", { ascending: true });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const events: AuditEvent[] = (data ?? []).map((row) => ({
    id: row.id,
    eventType: row.event_type,
    actor: row.actor,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    createdAt: row.created_at,
  }));

  return NextResponse.json({ events });
}
