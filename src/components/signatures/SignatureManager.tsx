"use client";

import { useEffect, useState } from "react";
import { Loader2, Pencil, Plus, Star, Trash2, Check, X } from "lucide-react";
import clsx from "clsx";
import { SignatureModal } from "@/components/SignatureModal";
import { MAX_SIGNATURES_PER_USER } from "@/lib/signature-limits";
import type { SavedSignature } from "@/types/signature";

export function SignatureManager() {
  const [signatures, setSignatures] = useState<SavedSignature[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/signatures");
      if (!res.ok) throw new Error("Failed to load signatures");
      const data: { signatures: SavedSignature[] } = await res.json();
      setSignatures(data.signatures);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const setDefault = async (id: string) => {
    setBusyId(id);
    setSignatures((prev) => prev.map((s) => ({ ...s, isDefault: s.id === id })));
    try {
      await fetch(`/api/signatures/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDefault: true }),
      });
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (id: string) => {
    setBusyId(id);
    const prev = signatures;
    setSignatures((p) => p.filter((s) => s.id !== id));
    try {
      const res = await fetch(`/api/signatures/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    } catch {
      setSignatures(prev);
    } finally {
      setBusyId(null);
    }
  };

  const startRename = (sig: SavedSignature) => {
    setRenamingId(sig.id);
    setRenameValue(sig.name);
  };

  const confirmRename = async (id: string) => {
    const name = renameValue.trim();
    setRenamingId(null);
    if (!name) return;
    setSignatures((prev) => prev.map((s) => (s.id === id ? { ...s, name } : s)));
    await fetch(`/api/signatures/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
  };

  if (loading) {
    return (
      <div className="grid place-items-center py-10 text-muted">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {signatures.map((sig) => (
          <div key={sig.id} className="card !p-3">
            <div className="rounded-lg border border-border bg-white p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={sig.imageDataUrl}
                alt={sig.name}
                className="h-16 w-full object-contain"
              />
            </div>

            {renamingId === sig.id ? (
              <div className="mt-2 flex items-center gap-1">
                <input
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") confirmRename(sig.id);
                    if (e.key === "Escape") setRenamingId(null);
                  }}
                  className="w-full min-w-0 rounded-md border border-border bg-bg px-2 py-1 text-xs outline-none focus:border-accent"
                />
                <button
                  onClick={() => confirmRename(sig.id)}
                  className="shrink-0 rounded-md p-1 text-muted hover:text-text"
                  aria-label="Confirm rename"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setRenamingId(null)}
                  className="shrink-0 rounded-md p-1 text-muted hover:text-text"
                  aria-label="Cancel rename"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => startRename(sig)}
                className="mt-2 flex w-full items-center justify-center gap-1 truncate text-xs text-muted hover:text-text"
              >
                <Pencil className="h-3 w-3 shrink-0" />
                <span className="truncate">{sig.name}</span>
              </button>
            )}

            <div className="mt-2 flex items-center justify-between gap-1">
              <button
                onClick={() => setDefault(sig.id)}
                disabled={sig.isDefault || busyId === sig.id}
                className={clsx(
                  "inline-flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium transition",
                  sig.isDefault
                    ? "cursor-default bg-accent/10 text-accent"
                    : "text-muted hover:bg-white/5 hover:text-text",
                )}
              >
                <Star className={clsx("h-3.5 w-3.5", sig.isDefault && "fill-accent")} />
                {sig.isDefault ? "Default" : "Set default"}
              </button>
              <button
                onClick={() => remove(sig.id)}
                disabled={busyId === sig.id}
                aria-label={`Delete ${sig.name}`}
                className="shrink-0 rounded-md p-1.5 text-muted hover:bg-white/5 hover:text-red-400"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}

        {signatures.length < MAX_SIGNATURES_PER_USER && (
          <button
            onClick={() => setShowAddModal(true)}
            className="grid min-h-[9.5rem] place-items-center gap-2 rounded-2xl border-2 border-dashed border-border text-sm text-muted transition hover:border-accent hover:text-text"
          >
            <Plus className="h-5 w-5" />
            Add signature
          </button>
        )}
      </div>

      {signatures.length === 0 ? (
        <p className="mt-4 text-center text-sm text-muted">
          You don&apos;t have any saved signatures yet.
        </p>
      ) : signatures.length >= MAX_SIGNATURES_PER_USER ? (
        <p className="mt-4 text-center text-sm text-muted">
          You&apos;ve reached the {MAX_SIGNATURES_PER_USER}-signature limit. Delete one to add
          another.
        </p>
      ) : null}

      {showAddModal && (
        <SignatureModal
          variant="library"
          onClose={() => setShowAddModal(false)}
          onConfirm={() => {
            setShowAddModal(false);
            load();
          }}
        />
      )}
    </div>
  );
}
