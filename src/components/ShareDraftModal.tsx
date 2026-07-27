"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Lock, X } from "lucide-react";
import clsx from "clsx";

export function ShareDraftModal({
  documentId,
  onClose,
}: {
  documentId: string;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);
  const [wantsPassword, setWantsPassword] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/documents/${documentId}/share`);
        if (!res.ok) throw new Error("Failed to load sharing settings");
        const data: { token: string; shareEnabled: boolean; hasPassword: boolean } =
          await res.json();
        setToken(data.token);
        setEnabled(data.shareEnabled);
        setHasPassword(data.hasPassword);
        setWantsPassword(data.hasPassword);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    })();
  }, [documentId]);

  const shareUrl =
    token && typeof window !== "undefined" ? `${window.location.origin}/view/${token}` : "";

  const save = async (nextEnabled: boolean) => {
    if (nextEnabled && wantsPassword && !hasPassword && !passwordInput.trim()) {
      setError("Enter a password, or turn off the password requirement.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const body: { enabled: boolean; password?: string | null } = { enabled: nextEnabled };
      if (nextEnabled) {
        if (!wantsPassword) {
          body.password = null;
        } else if (passwordInput.trim()) {
          body.password = passwordInput.trim();
        }
      }
      const res = await fetch(`/api/documents/${documentId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to update sharing");
      }
      const data: { token: string; shareEnabled: boolean; hasPassword: boolean } =
        await res.json();
      setEnabled(data.shareEnabled);
      setHasPassword(data.hasPassword);
      setWantsPassword(data.hasPassword);
      setPasswordInput("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setEnabled((prev) => prev);
    } finally {
      setSaving(false);
    }
  };

  const copyLink = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 backdrop-blur sm:p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-panel p-5 shadow-glow sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold sm:text-lg">Share document</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted hover:bg-white/5 hover:text-text"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : (
          <div className="space-y-4">
            <label className="flex items-start justify-between gap-3">
              <span className="text-sm">
                <span className="font-medium text-text">Share link</span>
                <span className="mt-0.5 block text-xs text-muted">
                  Anyone with the link can view and download a read-only copy.
                </span>
              </span>
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => {
                  const next = e.target.checked;
                  setEnabled(next);
                  save(next);
                }}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-border accent-accent"
              />
            </label>

            {enabled && (
              <>
                <div className="flex items-center gap-2 rounded-lg border border-border bg-bg px-3 py-2">
                  <span className="min-w-0 flex-1 truncate text-sm">{shareUrl}</span>
                  <button
                    onClick={copyLink}
                    className="shrink-0 rounded-md p-1.5 text-muted hover:bg-white/5 hover:text-text"
                    aria-label="Copy link"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm text-text/90">
                    <input
                      type="checkbox"
                      checked={wantsPassword}
                      onChange={(e) => setWantsPassword(e.target.checked)}
                      className="h-4 w-4 rounded border-border accent-accent"
                    />
                    <Lock className="h-3.5 w-3.5 text-muted" />
                    Require a password
                  </label>
                  {wantsPassword && (
                    <input
                      type="password"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder={
                        hasPassword ? "Leave blank to keep current password" : "Set a password"
                      }
                      className="mt-2 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
                    />
                  )}
                </div>

                <button
                  onClick={() => save(true)}
                  disabled={saving}
                  className={clsx(
                    "btn-primary w-full justify-center",
                    saving && "cursor-not-allowed opacity-70",
                  )}
                >
                  {saving ? "Saving…" : "Save sharing settings"}
                </button>
              </>
            )}

            {error && <p className="text-xs text-red-400">{error}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
