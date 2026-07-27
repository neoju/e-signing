"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { FolderOpen, LogIn, LogOut, PenLine, User } from "lucide-react";
import { useState } from "react";
import clsx from "clsx";

export function AuthMenu({ className }: { className?: string } = {}) {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);

  if (status === "loading") {
    return (
      <div
        className={clsx(
          "h-8 w-8 animate-pulse rounded-full border border-border bg-white/5",
          className,
        )}
      />
    );
  }

  const email = session?.user?.email ?? null;
  const initial = email?.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className={clsx("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-full border border-border bg-panel px-2 py-1 text-sm text-text/90 transition hover:bg-white/5"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
      >
        {email ? (
          <span className="grid h-6 w-6 place-items-center rounded-full bg-accent text-xs font-semibold text-white">
            {initial}
          </span>
        ) : (
          <span className="grid h-6 w-6 place-items-center rounded-full bg-white/10 text-muted">
            <User className="h-3.5 w-3.5" />
          </span>
        )}
        {email && (
          <span className="hidden max-w-[160px] truncate pr-1 sm:inline">{email}</span>
        )}
      </button>
      {open && (
        <>
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-10 cursor-default"
          />
          <div
            role="menu"
            className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-xl border border-border bg-panel shadow-lg"
          >
            {email && (
              <div className="flex items-center gap-2 border-b border-border px-3 py-2.5 text-xs text-muted">
                <User className="h-3.5 w-3.5" />
                <span className="truncate">{email}</span>
              </div>
            )}
            <Link
              href="/documents"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-text/90 transition hover:bg-white/5"
            >
              <FolderOpen className="h-4 w-4" />
              Your Documents
            </Link>
            <Link
              href="/signatures"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-text/90 transition hover:bg-white/5"
            >
              <PenLine className="h-4 w-4" />
              Your Signatures
            </Link>
            {email ? (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  void signOut({ callbackUrl: "/" });
                }}
                className="flex w-full items-center gap-2 border-t border-border px-3 py-2.5 text-left text-sm text-text/90 transition hover:bg-white/5"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            ) : (
              <Link
                href="/login"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex w-full items-center gap-2 border-t border-border px-3 py-2.5 text-left text-sm text-text/90 transition hover:bg-white/5"
              >
                <LogIn className="h-4 w-4" />
                Sign in
              </Link>
            )}
          </div>
        </>
      )}
    </div>
  );
}
