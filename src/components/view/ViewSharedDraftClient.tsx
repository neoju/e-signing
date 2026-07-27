"use client";

import { useEffect, useState } from "react";
import { Download, FileSignature, Loader2, Lock } from "lucide-react";
import clsx from "clsx";
import { renderPdfPages } from "@/lib/pdf-render";
import { buildSignedPdfBytes } from "@/lib/pdf-export";
import { downloadBlob } from "@/lib/file-utils";
import { ViewPageCanvas } from "./ViewPageCanvas";
import type { Field, RenderedPage } from "@/types/pdf-editor";

type LoadedDoc = { title: string; fields: Field[]; pdfUrl: string };
type Status = "checking" | "locked" | "loading" | "ready" | "not-found" | "error";

const storageKey = (token: string) => `signz.viewPassword.${token}`;

export function ViewSharedDraftClient({ token }: { token: string }) {
  const [status, setStatus] = useState<Status>("checking");
  const [lockError, setLockError] = useState<string | null>(null);
  const [passwordInput, setPasswordInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [doc, setDoc] = useState<LoadedDoc | null>(null);
  const [pages, setPages] = useState<RenderedPage[]>([]);
  const [pdfBytes, setPdfBytes] = useState<ArrayBuffer | null>(null);
  const [downloading, setDownloading] = useState(false);

  const renderDoc = async (data: LoadedDoc) => {
    setStatus("loading");
    setDoc(data);
    const res = await fetch(data.pdfUrl);
    const buf = await res.arrayBuffer();
    setPdfBytes(buf);
    const rendered = await renderPdfPages(buf.slice(0));
    setPages(rendered);
    setStatus("ready");
  };

  const attempt = async (password: string | null) => {
    setSubmitting(true);
    setLockError(null);
    try {
      const res = password
        ? await fetch(`/api/view/${token}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password }),
          })
        : await fetch(`/api/view/${token}`);

      if (res.status === 404) {
        setStatus("not-found");
        return;
      }
      if (!res.ok) {
        if (password) {
          if (res.status === 429) {
            const retryAfter = Number(res.headers.get("Retry-After")) || 0;
            const wait = retryAfter >= 60
              ? `${Math.ceil(retryAfter / 60)} min`
              : `${Math.max(1, retryAfter)}s`;
            setLockError(`Too many attempts. Try again in ${wait}.`);
          } else {
            setLockError("Incorrect password");
          }
          setStatus("locked");
        } else {
          setStatus("error");
        }
        return;
      }
      const data = await res.json();
      if (data.requiresPassword) {
        setStatus("locked");
        return;
      }
      if (password) {
        try {
          sessionStorage.setItem(storageKey(token), password);
        } catch {
          // ignore — worst case they re-enter it after a refresh
        }
      }
      await renderDoc(data);
    } catch {
      setStatus("error");
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    let cached: string | null = null;
    try {
      cached = sessionStorage.getItem(storageKey(token));
    } catch {
      // ignore
    }
    attempt(cached);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleDownload = async () => {
    if (!pdfBytes || !doc) return;
    setDownloading(true);
    try {
      const bytes = await buildSignedPdfBytes(pdfBytes, doc.fields);
      downloadBlob(
        new Blob([bytes], { type: "application/pdf" }),
        `${doc.title.replace(/\.pdf$/i, "")}.pdf`,
      );
    } finally {
      setDownloading(false);
    }
  };

  if (status === "checking" || status === "loading") {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-bg text-muted">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (status === "not-found") {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-bg p-6 text-center">
        <div>
          <p className="mb-2 text-lg font-semibold">Link not available</p>
          <p className="text-sm text-muted">
            This document isn&apos;t shared anymore, or the link is incorrect.
          </p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-bg p-6 text-center text-sm text-muted">
        Something went wrong loading this document.
      </div>
    );
  }

  if (status === "locked") {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-bg p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (passwordInput.trim()) attempt(passwordInput.trim());
          }}
          className="card w-full max-w-sm"
        >
          <div className="mb-4 flex items-center gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent/10 text-accent">
              <Lock className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Password required</h2>
              <p className="text-xs text-muted">Enter the password to view this document.</p>
            </div>
          </div>
          {lockError && <p className="mb-3 text-xs text-red-400">{lockError}</p>}
          <input
            type="password"
            autoFocus
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            placeholder="Password"
            className="mb-3 w-full rounded-lg border border-border bg-bg px-4 py-2.5 text-sm outline-none focus:border-accent"
          />
          <button
            type="submit"
            disabled={submitting || !passwordInput.trim()}
            className={clsx(
              "btn-primary w-full justify-center",
              (submitting || !passwordInput.trim()) && "cursor-not-allowed opacity-70",
            )}
          >
            {submitting ? "Checking…" : "View document"}
          </button>
        </form>
      </div>
    );
  }

  if (!doc) return null;

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-bg">
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border bg-panel px-3 py-2.5 sm:px-6 sm:py-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-accent text-white">
            <FileSignature className="h-3.5 w-3.5" />
          </div>
          <span className="min-w-0 truncate text-sm font-medium">{doc.title}</span>
        </div>
        <button
          onClick={handleDownload}
          disabled={downloading}
          className={clsx("btn-primary !px-3 sm:!px-5", downloading && "cursor-not-allowed opacity-70")}
        >
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">{downloading ? "Preparing…" : "Download"}</span>
        </button>
      </header>

      <div className="shrink-0 border-b border-border bg-panel/60 px-4 py-2 text-center text-xs text-muted">
        Shared for viewing only — this is a read-only copy.
      </div>

      <div className="flex-1 overflow-y-auto bg-[#1a1a1f] p-3 pb-10 sm:p-6 md:p-8">
        <div className="mx-auto flex max-w-3xl flex-col gap-4 sm:gap-6">
          {pages.map((p, i) => (
            <ViewPageCanvas key={i} page={p} pageIndex={i} totalPages={pages.length} fields={doc.fields} />
          ))}
        </div>
      </div>
    </div>
  );
}
