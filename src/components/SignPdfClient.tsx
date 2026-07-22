"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, FileSignature, Loader2 } from "lucide-react";
import clsx from "clsx";
import { SignatureModal } from "@/components/SignatureModal";
import { SignPageCanvas } from "@/components/sign/SignPageCanvas";
import { renderPdfPages } from "@/lib/pdf-render";
import { buildSignedPdfBytes } from "@/lib/pdf-export";
import type { Field, RenderedPage } from "@/types/pdf-editor";

export function SignPdfClient({
  token,
  title,
  initialFields,
  pdfUrl,
}: {
  token: string;
  title: string;
  initialFields: Field[];
  pdfUrl: string;
}) {
  const [pages, setPages] = useState<RenderedPage[]>([]);
  const [fields, setFields] = useState<Field[]>(initialFields);
  const [pdfBytes, setPdfBytes] = useState<ArrayBuffer | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSigModal, setShowSigModal] = useState(false);
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);
  const [signedBlobUrl, setSignedBlobUrl] = useState<string | null>(null);
  const [savedSig, setSavedSig] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch(pdfUrl);
      const buf = await res.arrayBuffer();
      if (cancelled) return;
      setPdfBytes(buf);
      const rendered = await renderPdfPages(buf.slice(0));
      if (cancelled) return;
      setPages(rendered);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [pdfUrl]);

  const updateField = (id: string, patch: Partial<Field>) =>
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));

  const handleSignatureClick = (id: string) => {
    const field = fields.find((f) => f.id === id);
    if (!field) return;
    // Reuse the signature they already drew/typed/uploaded for every
    // subsequent signature field — only ask again if they tap a field that
    // already has a value (i.e. they want to redo it).
    if (!field.value && savedSig) {
      updateField(id, { value: savedSig });
      return;
    }
    setActiveFieldId(id);
    setShowSigModal(true);
  };

  const recipientFields = useMemo(
    () => fields.filter((f) => f.assignee === "recipient"),
    [fields],
  );

  const allFilled = useMemo(
    () =>
      recipientFields.length > 0 &&
      recipientFields.every((f) => f.value.trim().length > 0),
    [recipientFields],
  );

  const submit = async () => {
    if (!pdfBytes || !allFilled) return;
    setSubmitting(true);
    setError(null);
    try {
      const signedBytes = await buildSignedPdfBytes(pdfBytes, fields);
      const blob = new Blob([signedBytes], { type: "application/pdf" });
      const form = new FormData();
      form.append("file", blob, "signed.pdf");
      form.append("fields", JSON.stringify(fields));
      const res = await fetch(`/api/sign/${token}/complete`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to submit signature");
      }
      setSignedBlobUrl(URL.createObjectURL(blob));
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-bg text-muted">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (done) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-bg p-6">
        <div className="card w-full max-w-md text-center">
          <CheckCircle2 className="mx-auto mb-4 h-10 w-10 text-accent" />
          <h2 className="mb-2 text-xl font-semibold">
            Thanks — the sender has been notified
          </h2>
          <p className="mb-6 text-sm text-muted">
            Your signed copy of &ldquo;{title}&rdquo; is ready.
          </p>
          {signedBlobUrl && (
            <a
              href={signedBlobUrl}
              download={`${title.replace(/\.pdf$/i, "")}-signed.pdf`}
              className="btn-primary w-full justify-center"
            >
              Download your copy
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-bg">
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border bg-panel px-3 py-2.5 sm:px-6 sm:py-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-accent text-white">
            <FileSignature className="h-3.5 w-3.5" />
          </div>
          <span className="min-w-0 truncate text-sm font-medium">{title}</span>
        </div>
        <button
          onClick={submit}
          disabled={!allFilled || submitting}
          className={clsx(
            "btn-primary !px-3 sm:!px-5",
            (!allFilled || submitting) && "cursor-not-allowed opacity-50",
          )}
        >
          {submitting ? "Submitting…" : "Submit signature"}
        </button>
      </header>

      {error && (
        <div className="shrink-0 border-b border-red-500/30 bg-red-500/10 px-4 py-2 text-center text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="shrink-0 border-b border-border bg-panel/60 px-4 py-2 text-center text-xs text-muted">
        Fill in the outlined fields to add your signature. Your signature is
        reused automatically for every signature field.
      </div>

      <div className="flex-1 overflow-y-auto bg-[#1a1a1f] p-3 pb-10 sm:p-6 md:p-8">
        <div className="mx-auto flex max-w-3xl flex-col gap-4 sm:gap-6">
          {pages.map((p, i) => (
            <SignPageCanvas
              key={i}
              page={p}
              pageIndex={i}
              totalPages={pages.length}
              fields={fields}
              onChangeField={updateField}
              onSignatureClick={handleSignatureClick}
            />
          ))}
        </div>
      </div>

      {!allFilled && (
        <div className="shrink-0 border-t border-border bg-panel px-4 py-2 text-center text-xs text-muted">
          Fill in every highlighted field to submit.
        </div>
      )}

      {showSigModal && (
        <SignatureModal
          onClose={() => setShowSigModal(false)}
          onConfirm={(dataUrl) => {
            setSavedSig(dataUrl);
            if (activeFieldId) updateField(activeFieldId, { value: dataUrl });
            setShowSigModal(false);
          }}
        />
      )}
    </div>
  );
}
