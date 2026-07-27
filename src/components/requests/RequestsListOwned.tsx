"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Copy, Download, History, Pencil, Share2 } from "lucide-react";
import clsx from "clsx";
import { AuditLogModal } from "@/components/requests/AuditLogModal";
import { ShareDraftModal } from "@/components/ShareDraftModal";
import type { OwnedRequestSummary } from "@/types/signature-request";

export function RequestsListOwned({
  initialRequests,
}: {
  initialRequests: OwnedRequestSummary[];
}) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [shareId, setShareId] = useState<string | null>(null);
  const [auditId, setAuditId] = useState<string | null>(null);

  const copyLink = async (r: OwnedRequestSummary) => {
    await navigator.clipboard.writeText(`${window.location.origin}/sign/${r.token}`);
    setCopiedId(r.id);
    setTimeout(() => setCopiedId((c) => (c === r.id ? null : c)), 1500);
  };

  if (initialRequests.length === 0) {
    return (
      <div className="card text-center text-sm text-muted">
        You don&apos;t have any documents yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {initialRequests.map((r) => (
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
                  : r.status === "draft"
                    ? "bg-white/10 text-muted"
                    : "bg-accent/10 text-accent",
              )}
            >
              {r.status === "completed"
                ? "Signed"
                : r.status === "draft"
                  ? "Draft"
                  : "Pending"}
            </span>
            {r.status === "draft" ? (
              <>
                <button
                  onClick={() => setShareId(r.id)}
                  className="btn-ghost !px-3"
                  aria-label="Share"
                >
                  <Share2 className="h-4 w-4" />
                </button>
                <Link
                  href={`/?draft=${r.id}`}
                  className="btn-ghost !px-3"
                  aria-label="Continue editing"
                >
                  <Pencil className="h-4 w-4" />
                </Link>
              </>
            ) : (
              <>
                <button
                  onClick={() => setAuditId(r.id)}
                  className="btn-ghost !px-3"
                  aria-label="View activity log"
                >
                  <History className="h-4 w-4" />
                </button>
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
                ) : r.status === "pending" ? (
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
                ) : null}
              </>
            )}
          </div>
        </div>
      ))}

      {shareId && <ShareDraftModal documentId={shareId} onClose={() => setShareId(null)} />}
      {auditId && <AuditLogModal requestId={auditId} onClose={() => setAuditId(null)} />}
    </div>
  );
}
