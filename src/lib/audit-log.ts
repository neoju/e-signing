import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuditActor, AuditEventType } from "@/types/audit-log";

// Best-effort audit trail insert — logging failures must never break the
// send/view/sign flow they're attached to, so errors are swallowed (and
// logged server-side for debugging).
export async function recordAuditEvent(
  supabase: SupabaseClient,
  params: {
    requestId: string;
    eventType: AuditEventType;
    actor: AuditActor;
    ipAddress: string | null;
    userAgent: string | null;
  },
): Promise<void> {
  const { error } = await supabase.from("signature_request_events").insert({
    request_id: params.requestId,
    event_type: params.eventType,
    actor: params.actor,
    ip_address: params.ipAddress,
    user_agent: params.userAgent,
  });
  if (error) {
    console.error("Failed to record audit event", params.eventType, error);
  }
}
