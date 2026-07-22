"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SignatureModal } from "./SignatureModal";
import { TopBar } from "./pdf-editor/TopBar";
import { Sidebar } from "./pdf-editor/Sidebar";
import { MobileToolbar } from "./pdf-editor/MobileToolbar";
import { PageReviewPanel } from "./pdf-editor/PageReviewPanel";
import { PdfPageCanvas } from "./pdf-editor/PdfPageCanvas";
import { Uploader } from "./pdf-editor/Uploader";
import { renderPdfPages } from "@/lib/pdf-render";
import { exportSignedPdf } from "@/lib/pdf-export";
import type { Field, FieldKind, RenderedPage } from "@/types/pdf-editor";

export function PdfEditor() {
  const [file, setFile] = useState<File | null>(null);
  const [pdfBytes, setPdfBytes] = useState<ArrayBuffer | null>(null);
  const [pages, setPages] = useState<RenderedPage[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [tool, setTool] = useState<FieldKind | null>(null);
  const [savedSig, setSavedSig] = useState<string | null>(null);
  const [showSigModal, setShowSigModal] = useState(false);
  const [pendingSigField, setPendingSigField] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [activePage, setActivePage] = useState(0);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const pageRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const contentRef = useRef<HTMLDivElement | null>(null);

  const loadFile = useCallback(async (f: File) => {
    setLoading(true);
    setFields([]);
    setActivePage(0);
    setFile(f);
    const buf = await f.arrayBuffer();
    setPdfBytes(buf);
    const rendered = await renderPdfPages(buf);
    setPages(rendered);
    setLoading(false);
  }, []);

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
    const base: Field = {
      id,
      kind: tool,
      pageIndex,
      x,
      y,
      w: tool === "signature" ? 0.22 : 0.14,
      h: tool === "signature" ? 0.06 : 0.03,
      value: "",
    };
    if (tool === "signature") {
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

  const updateField = (id: string, patch: Partial<Field>) =>
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));

  const removeField = (id: string) => {
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
      <TopBar
        fileName={file.name}
        onReset={() => {
          setFile(null);
          setPdfBytes(null);
          setPages([]);
          setFields([]);
          setActivePage(0);
        }}
        onExport={exportPdf}
        exporting={exporting}
        canExport={fields.length > 0}
      />
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
    </div>
  );
}
