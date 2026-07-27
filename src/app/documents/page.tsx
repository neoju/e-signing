import Link from "next/link";
import { ArrowLeft, FileSignature } from "lucide-react";
import { auth } from "@/auth";
import { AuthMenu } from "@/components/AuthMenu";
import { RequestsListLocal } from "@/components/requests/RequestsListLocal";
import { RequestsListOwned } from "@/components/requests/RequestsListOwned";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { OwnedRequestSummary } from "@/types/signature-request";

const SIGNED_URL_TTL_SECONDS = 60 * 10;

async function loadOwnedRequests(email: string): Promise<OwnedRequestSummary[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("signature_requests")
    .select("id, title, token, status, signed_path, created_at")
    .eq("owner_email", email)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return Promise.all(
    data.map(async (row) => {
      let signedUrl: string | null = null;
      if (row.status === "completed" && row.signed_path) {
        const { data: urlData } = await supabase.storage
          .from("documents")
          .createSignedUrl(row.signed_path, SIGNED_URL_TTL_SECONDS);
        signedUrl = urlData?.signedUrl ?? null;
      }
      return {
        id: row.id,
        title: row.title,
        token: row.token,
        status: row.status as OwnedRequestSummary["status"],
        createdAt: row.created_at,
        signedUrl,
      };
    }),
  );
}

export default async function DocumentsPage() {
  const session = await auth();
  const email = session?.user?.email ?? null;
  const ownedRequests = email ? await loadOwnedRequests(email) : null;

  return (
    <div className="min-h-[100dvh] bg-bg p-4 sm:p-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between gap-2">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-text"
          >
            <ArrowLeft className="h-4 w-4" /> New document
          </Link>
          <AuthMenu />
        </div>

        <div className="mb-2 flex items-center gap-2">
          <div className="grid h-7 w-7 place-items-center rounded-md bg-accent text-white">
            <FileSignature className="h-3.5 w-3.5" />
          </div>
          <h1 className="text-lg font-semibold">Your Documents</h1>
        </div>

        {ownedRequests !== null ? (
          <>
            <p className="mb-6 text-sm text-muted">
              Signed in as <span className="text-text/90">{email}</span> —
              showing every sent request from this account.
            </p>
            <RequestsListOwned initialRequests={ownedRequests} />
          </>
        ) : (
          <>
            <p className="mb-4 text-sm text-muted">
              This list is stored only in this browser — it isn&apos;t synced
              anywhere else.
            </p>
            <div className="card mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted">
                <span className="text-text/90">Sign in</span> to sync your sent
                requests across devices.
              </p>
              <Link href="/login" className="btn-primary !px-4">
                Sign in
              </Link>
            </div>
            <RequestsListLocal />
          </>
        )}
      </div>
    </div>
  );
}
