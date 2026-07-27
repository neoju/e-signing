"use client";

import { useEffect, useState } from "react";
import { Eye, Loader2, PenLine, Send, X } from "lucide-react";
import { describeUserAgent } from "@/lib/user-agent";
import type { AuditEvent, AuditEventType } from "@/types/audit-log";

const EVENT_ICON: Record<AuditEventType, typeof Send> = {
  sent: Send,
  viewed: Eye,
  signed: PenLine,
};

const EVENT_LABEL: Record<AuditEventType, string> = {
  sent: "Sent for signature",
  viewed: "Document opened",
  signed: "Signed",
};

export function AuditLogModal({
  requestId,
  onClose,
}: {
  requestId: string;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<AuditEvent[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/documents/${requestId}/audit`);
        if (!res.ok) throw new Error("Failed to load activity log");
        const data: { events: AuditEvent[] } = await res.json();
        setEvents(data.events);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    })();
  }, [requestId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 backdrop-blur sm:p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-panel p-5 shadow-glow sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold sm:text-lg">Activity log</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted hover:bg-white/5 hover:text-text"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-6 text-muted">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : error ? (
          <p className="text-sm text-red-400">{error}</p>
        ) : events.length === 0 ? (
          <p className="text-sm text-muted">No activity recorded yet.</p>
        ) : (
          <ul className="space-y-3">
            {events.map((e) => {
              const Icon = EVENT_ICON[e.eventType];
              return (
                <li key={e.id} className="flex items-start gap-3">
                  <div className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/5 text-muted">
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{EVENT_LABEL[e.eventType]}</p>
                    <p className="text-xs text-muted">
                      {new Date(e.createdAt).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted">
                      {describeUserAgent(e.userAgent)}
                      {e.ipAddress ? ` · ${e.ipAddress}` : ""}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
