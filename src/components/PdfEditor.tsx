"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Check, Copy, X, Loader2 } from "lucide-react";
import { SignatureModal } from "./SignatureModal";
import { TopBar } from "./pdf-editor/TopBar";
import { RecipientAssignBar } from "./pdf-editor/RecipientAssignBar";
import { Sidebar } from "./pdf-editor/Sidebar";
import { MobileToolbar } from "./pdf-editor/MobileToolbar";
import { PageReviewPanel } from "./pdf-editor/PageReviewPanel";
import { PdfPageCanvas } from "./pdf-editor/PdfPageCanvas";
import { Uploader } from "./pdf-editor/Uploader";
import { renderPdfPages } from "@/lib/pdf-render";
import { exportSignedPdf } from "@/lib/pdf-export";
import { addSentRequest } from "@/lib/sent-requests";
import { MAX_PDF_BYTES, MAX_PDF_MB } from "@/lib/upload-limits";
import type { Field, FieldAssignee, FieldKind, RenderedPage } from "@/types/pdf-editor";
import type { DraftDocument } from "@/types/signature-request";
import type { SavedSignature } from "@/types/signature";

type EditorMode = "edit" | "assign-recipient";

export function PdfEditor() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [file, setFile] = useState<File | null>(null);
  const [pdfBytes, setPdfBytes] = useState<ArrayBuffer | null>(null);
  const [pages, setPages] = useState<RenderedPage[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [tool, setTool] = useState<FieldKind | null>(null);
  const [savedSig, setSavedSig] = useState<string | null>(null);
  const [showSigModal, setShowSigModal] = useState(false);
  const [pendingSigField, setPendingSigField] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [mode, setMode] = useState<EditorMode>("edit");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [activePage, setActivePage] = useState(0);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showAuthRequired, setShowAuthRequired] = useState(false);
  const pageRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const contentRef = useRef<HTMLDivElement | null>(null);

  const loadFile = useCallback(async (f: File) => {
    if (f.size > MAX_PDF_BYTES) {
      window.alert(`PDF is too large (max ${MAX_PDF_MB} MB).`);
      return;
    }
    setLoading(true);
    setFields([]);
    setActivePage(0);
    setMode("edit");
    setFile(f);
    setDraftId(null);
    setDirty(false);
    const buf = await f.arrayBuffer();
    setPdfBytes(buf);
    const rendered = await renderPdfPages(buf);
    setPages(rendered);
    setLoading(false);
  }, []);

  const loadDraft = useCallback(async (id: string) => {
    setLoadingDraft(true);
    try {
      const res = await fetch(`/api/documents/${id}`);
      if (!res.ok) throw new Error("Failed to load document");
      const data: DraftDocument = await res.json();
      const pdfRes = await fetch(data.pdfUrl);
      const buf = await pdfRes.arrayBuffer();
      const f = new File([buf], `${data.title}.pdf`, { type: "application/pdf" });
      setFile(f);
      setPdfBytes(buf);
      const rendered = await renderPdfPages(buf.slice(0));
      setPages(rendered);
      setFields(data.fields);
      setActivePage(0);
      setMode("edit");
      setDraftId(data.id);
      setDirty(false);
    } catch {
      // Fall back silently to the empty uploader if the draft can't be loaded
      // (deleted, not owned by this account, session expired, etc).
    } finally {
      setLoadingDraft(false);
    }
  }, []);

  useEffect(() => {
    const draftParam = searchParams.get("draft");
    if (draftParam) loadDraft(draftParam);
    // Only ever run this for the draft id present on first render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const email = session?.user?.email;
    if (!email) return;
    (async () => {
      try {
        const res = await fetch("/api/signatures");
        if (!res.ok) return;
        const data: { signatures: SavedSignature[] } = await res.json();
        const def = data.signatures.find((s) => s.isDefault) ?? data.signatures[0];
        // Don't clobber a signature the user has already picked/drawn in
        // this session.
        if (def) setSavedSig((prev) => prev ?? def.imageDataUrl);
      } catch {
        // Non-fatal — falls back to the usual draw/type/upload flow.
      }
    })();
  }, [session?.user?.email]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f && f.type === "application/pdf") loadFile(f);
  };

  const jumpToPage = (index: number) => {
    pageRefs.current[index]?.scrollIntoView({ behavior: "instant", block: "start" });
  };

  useEffect(() => {
    if (pages.length === 0) return;
    const container = contentRef.current;
    if (!container) return;

    const ratios: Record<number, number> = {};
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const idx = Number((entry.target as HTMLElement).dataset.pageIndex);
          ratios[idx] = entry.intersectionRatio;
        }
        let best = 0;
        let bestRatio = 0;
        for (const [idx, ratio] of Object.entries(ratios)) {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            best = Number(idx);
          }
        }
        if (bestRatio > 0) setActivePage(best);
      },
      { root: container, threshold: [0, 0.25, 0.5, 0.75, 1] },
    );
    Object.values(pageRefs.current).forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [pages]);

  const placeField = (pageIndex: number, e: React.MouseEvent<HTMLDivElement>) => {
    setSelectedFieldId(null);
    if (!tool) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const id = crypto.randomUUID();
    const assignee: FieldAssignee = mode === "assign-recipient" ? "recipient" : "sender";
    const base: Field = {
      id,
      kind: tool,
      pageIndex,
      x,
      y,
      w: tool === "signature" ? 0.22 : 0.14,
      h: tool === "signature" ? 0.06 : 0.03,
      value: "",
      assignee,
    };
    setDirty(true);
    if (assignee === "recipient") {
      // The next signer fills these in themselves — never pre-fill or use
      // the sender's own saved signature here.
      setFields((prev) => [...prev, base]);
    } else if (tool === "signature") {
      if (savedSig) {
        setFields((prev) => [...prev, { ...base, value: savedSig }]);
      } else {
        setFields((prev) => [...prev, base]);
        setPendingSigField(id);
        setShowSigModal(true);
      }
    } else if (tool === "date") {
      setFields((prev) => [
        ...prev,
        { ...base, value: new Date().toLocaleDateString() },
      ]);
    } else {
      setFields((prev) => [...prev, { ...base, value: "" }]);
    }
    setTool(null);
  };

  const updateField = (id: string, patch: Partial<Field>) => {
    setDirty(true);
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  };

  const removeField = (id: string) => {
    setDirty(true);
    setFields((prev) => prev.filter((f) => f.id !== id));
    setSelectedFieldId((prev) => (prev === id ? null : prev));
  };

  const onSigConfirmed = (dataUrl: string) => {
    setSavedSig(dataUrl);
    if (pendingSigField) {
      updateField(pendingSigField, { value: dataUrl });
      setPendingSigField(null);
    }
    setShowSigModal(false);
  };

  const exportPdf = async () => {
    if (!pdfBytes) return;
    setExporting(true);
    try {
      await exportSignedPdf(pdfBytes, fields, file?.name ?? "document");
    } finally {
      setExporting(false);
    }
  };

  const recipientFieldCount = fields.filter((f) => f.assignee === "recipient").length;

  const beginAssignRecipient = () => {
    setSelectedFieldId(null);
    setTool(null);
    setMode("assign-recipient");
  };

  const cancelAssignRecipient = () => {
    setTool(null);
    setMode("edit");
  };

  const generateLink = async () => {
    if (!pdfBytes || !file || recipientFieldCount === 0) return;
    setSending(true);
    setSendError(null);
    try {
      const title = file.name.replace(/\.pdf$/i, "");
      const form = new FormData();
      form.append("title", title);
      form.append("fields", JSON.stringify(fields));
      form.append("file", new Blob([pdfBytes], { type: "application/pdf" }), file.name);
      const res = await fetch("/api/documents/send", { method: "POST", body: form });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to create signature request");
      }
      const data: { id: string; token: string } = await res.json();
      addSentRequest({
        id: data.id,
        token: data.token,
        title,
        createdAt: new Date().toISOString(),
      });
      setShareLink(`${window.location.origin}/sign/${data.token}`);
      setMode("edit");
    } catch (e) {
      setSendError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSending(false);
    }
  };

  const saveDraft = async (): Promise<string | null> => {
    if (!pdfBytes || !file) return null;
    if (!session?.user?.email) {
      setShowAuthRequired(true);
      return null;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const title = file.name.replace(/\.pdf$/i, "");
      const form = new FormData();
      form.append("title", title);
      form.append("fields", JSON.stringify(fields));
      form.append("file", new Blob([pdfBytes], { type: "application/pdf" }), file.name);
      const url = draftId ? `/api/documents/${draftId}` : "/api/documents";
      const res = await fetch(url, { method: draftId ? "PATCH" : "POST", body: form });
      if (res.status === 401) {
        setShowAuthRequired(true);
        return null;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to save document");
      }
      const data: { id: string } = await res.json();
      setDraftId(data.id);
      setDirty(false);
      if (!draftId) {
        router.replace(`/?draft=${data.id}`, { scroll: false });
      }
      return data.id;
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Something went wrong");
      return null;
    } finally {
      setSaving(false);
    }
  };

  if (loadingDraft) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-bg text-muted">
        <div className="flex items-center gap-2 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading your document…
        </div>
      </div>
    );
  }

  if (!file) {
    return (
      <Uploader
        onFile={loadFile}
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
      />
    );
  }

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-bg">
      {mode === "assign-recipient" ? (
        <RecipientAssignBar
          areaCount={recipientFieldCount}
          onCancel={cancelAssignRecipient}
          onGenerate={generateLink}
          generating={sending}
        />
      ) : (
        <TopBar
          fileName={file.name}
          onReset={() => {
            setFile(null);
            setPdfBytes(null);
            setPages([]);
            setFields([]);
            setActivePage(0);
            setMode("edit");
            setDraftId(null);
            setDirty(false);
            router.replace("/", { scroll: false });
          }}
          onExport={exportPdf}
          exporting={exporting}
          canExport={fields.length > 0}
          onSend={beginAssignRecipient}
          canSend={!loading}
          onSave={saveDraft}
          saving={saving}
          dirty={dirty}
          canSave={fields.length > 0}
        />
      )}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          tool={tool}
          setTool={setTool}
          savedSig={savedSig}
          onEditSig={() => {
            setPendingSigField(null);
            setShowSigModal(true);
          }}
        />
        <div
          ref={contentRef}
          className="relative flex-1 overflow-y-auto bg-[#1a1a1f] p-3 pb-28 sm:p-6 md:p-8 md:pb-8"
        >
          {loading && (
            <div className="grid h-full place-items-center text-muted">
              Rendering PDF…
            </div>
          )}
          <div className="mx-auto flex max-w-3xl flex-col gap-4 sm:gap-6">
            {pages.map((p, i) => (
              <PdfPageCanvas
                key={i}
                page={p}
                pageIndex={i}
                totalPages={pages.length}
                fields={fields}
                tool={tool}
                placingAssignee={mode === "assign-recipient" ? "recipient" : "sender"}
                selectedFieldId={selectedFieldId}
                onSelectField={setSelectedFieldId}
                onChangeField={updateField}
                onRemoveField={removeField}
                onPlaceField={placeField}
                pageRef={(el) => {
                  pageRefs.current[i] = el;
                }}
              />
            ))}
          </div>
        </div>
        {pages.length > 0 && (
          <PageReviewPanel
            pages={pages}
            activePage={activePage}
            onJump={jumpToPage}
            className="hidden md:block"
          />
        )}
      </div>

      <MobileToolbar
        tool={tool}
        setTool={setTool}
        savedSig={savedSig}
        onEditSig={() => {
          setPendingSigField(null);
          setShowSigModal(true);
        }}
      />

      {showSigModal && (
        <SignatureModal
          onClose={() => {
            setShowSigModal(false);
            if (pendingSigField) {
              removeField(pendingSigField);
              setPendingSigField(null);
            }
          }}
          onConfirm={onSigConfirmed}
        />
      )}

      {sendError && (
        <div className="fixed inset-x-0 bottom-20 z-40 mx-auto w-fit rounded-lg bg-red-500/90 px-4 py-2 text-sm text-white shadow-lg md:bottom-6">
          {sendError}
        </div>
      )}

      {saveError && (
        <div className="fixed inset-x-0 bottom-20 z-40 mx-auto w-fit rounded-lg bg-red-500/90 px-4 py-2 text-sm text-white shadow-lg md:bottom-6">
          {saveError}
        </div>
      )}

      {showAuthRequired && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 backdrop-blur sm:p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-panel p-5 shadow-glow sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold sm:text-lg">Sign in to save</h3>
              <button
                onClick={() => setShowAuthRequired(false)}
                className="rounded-lg p-1.5 text-muted hover:bg-white/5 hover:text-text"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-6 text-sm text-muted">
              Saving documents requires an account. Signing in reloads the
              page, so download a copy first if you don&apos;t want to lose
              your current edits.
            </p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                onClick={() => setShowAuthRequired(false)}
                className="btn-ghost w-full justify-center sm:w-auto"
              >
                Not now
              </button>
              <button
                onClick={() => router.push("/login")}
                className="btn-primary w-full justify-center sm:w-auto"
              >
                Sign in
              </button>
            </div>
          </div>
        </div>
      )}

      {shareLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 backdrop-blur sm:p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-panel p-5 shadow-glow sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold sm:text-lg">
                Ready to send
              </h3>
              <button
                onClick={() => setShareLink(null)}
                className="rounded-lg p-1.5 text-muted hover:bg-white/5 hover:text-text"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-3 text-sm text-muted">
              Share this link with your recipient — they can sign without an
              account.
            </p>
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-border bg-bg px-3 py-2">
              <span className="min-w-0 flex-1 truncate text-sm">{shareLink}</span>
              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(shareLink);
                  setLinkCopied(true);
                  setTimeout(() => setLinkCopied(false), 1500);
                }}
                className="shrink-0 rounded-md p-1.5 text-muted hover:bg-white/5 hover:text-text"
                aria-label="Copy link"
              >
                {linkCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                onClick={() => setShareLink(null)}
                className="btn-ghost w-full justify-center sm:w-auto"
              >
                Stay here
              </button>
              <button
                onClick={() => router.push("/documents")}
                className="btn-primary w-full justify-center sm:w-auto"
              >
                View sent requests
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
