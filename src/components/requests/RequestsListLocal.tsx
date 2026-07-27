"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Download, History } from "lucide-react";
import clsx from "clsx";
import { AuditLogModal } from "@/components/requests/AuditLogModal";
import { getSentRequests } from "@/lib/sent-requests";
import type { RequestStatus, SentRequestRecord } from "@/types/signature-request";

type ViewRecord = SentRequestRecord & {
  status?: RequestStatus;
  signedUrl?: string | null;
  loadError?: boolean;
};

export function RequestsListLocal() {
  const [records, setRecords] = useState<ViewRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [auditId, setAuditId] = useState<string | null>(null);

  useEffect(() => {
    const stored = getSentRequests();
    setRecords(stored);
    if (stored.length === 0) {
      setLoading(false);
      return;
    }
    (async () => {
      const updated = await Promise.all(
        stored.map(async (r): Promise<ViewRecord> => {
          try {
            const res = await fetch(`/api/documents/${r.id}`);
            if (!res.ok) return { ...r, loadError: true };
            const data = await res.json();
            return { ...r, status: data.status, signedUrl: data.signedUrl };
          } catch {
            return { ...r, loadError: true };
          }
        }),
      );
      setRecords(updated);
      setLoading(false);
    })();
  }, []);

  const copyLink = async (r: ViewRecord) => {
    await navigator.clipboard.writeText(`${window.location.origin}/sign/${r.token}`);
    setCopiedId(r.id);
    setTimeout(() => setCopiedId((c) => (c === r.id ? null : c)), 1500);
  };

  if (records.length === 0 && !loading) {
    return (
      <div className="card text-center text-sm text-muted">
        You haven&apos;t sent any documents for signature yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {records.map((r) => (
        <div key={r.id} className="card flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{r.title}</p>
            <p className="text-xs text-muted">
              {new Date(r.createdAt).toLocaleString()}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span
              className={clsx(
                "rounded-full px-2.5 py-1 text-xs font-medium",
                r.status === "completed"
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "bg-accent/10 text-accent",
              )}
            >
              {r.loadError
                ? "Unknown"
                : r.status === "completed"
                  ? "Signed"
                  : "Pending"}
            </span>
            {!r.loadError && (
              <button
                onClick={() => setAuditId(r.id)}
                className="btn-ghost !px-3"
                aria-label="View activity log"
              >
                <History className="h-4 w-4" />
              </button>
            )}
            {r.status === "completed" && r.signedUrl ? (
              <a
                href={r.signedUrl}
                target="_blank"
                rel="noreferrer"
                className="btn-ghost !px-3"
                aria-label="Download signed PDF"
              >
                <Download className="h-4 w-4" />
              </a>
            ) : (
              <button
                onClick={() => copyLink(r)}
                className="btn-ghost !px-3"
                aria-label="Copy signing link"
              >
                {copiedId === r.id ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            )}
          </div>
        </div>
      ))}

      {auditId && <AuditLogModal requestId={auditId} onClose={() => setAuditId(null)} />}
    </div>
  );
}
