export type AuditEventType = "sent" | "viewed" | "signed";

export type AuditActor = "sender" | "recipient";

// Client-facing shape returned by GET /api/documents/[id]/audit.
export type AuditEvent = {
  id: string;
  eventType: AuditEventType;
  actor: AuditActor;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
};
