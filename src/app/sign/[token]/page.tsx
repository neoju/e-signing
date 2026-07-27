import { notFound } from "next/navigation";
import { CheckCircle2, Download } from "lucide-react";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { SignPdfClient } from "@/components/SignPdfClient";
import type { Field } from "@/types/pdf-editor";

const SIGNED_URL_TTL_SECONDS = 60 * 15;

export default async function SignPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = createSupabaseAdminClient();

  const { data: row } = await supabase
    .from("signature_requests")
    .select("id, title, original_path, signed_path, fields, status")
    .eq("token", token)
    .maybeSingle();

  if (!row) notFound();

  // Only rows actively awaiting a recipient's signature are signable. Drafts
  // (which reuse the same `token` for the read-only share link at
  // `/view/[token]`) must NOT be reachable here — otherwise the sign flow
  // would expose draft PDF/fields and bypass any share password the owner
  // configured. Any non-pending, non-completed status is treated as absent.
  if (row.status !== "pending" && row.status !== "completed") notFound();

  if (row.status === "completed") {
    let signedDocUrl: string | null = null;
    if (row.signed_path) {
      const { data: urlData } = await supabase.storage
        .from("documents")
        .createSignedUrl(row.signed_path, SIGNED_URL_TTL_SECONDS);
      signedDocUrl = urlData?.signedUrl ?? null;
    }

    return (
      <div className="min-h-[100dvh] bg-bg p-4 sm:p-8">
        <div className="mx-auto max-w-3xl">
          <div className="card mb-4 text-center">
            <CheckCircle2 className="mx-auto mb-4 h-10 w-10 text-accent" />
            <h2 className="mb-2 text-xl font-semibold">Already signed</h2>
            <p className="mb-4 text-sm text-muted">
              &ldquo;{row.title}&rdquo; has already been signed. This link can
              only be used to view the completed document.
            </p>
            {signedDocUrl && (
              <a
                href={signedDocUrl}
                target="_blank"
                rel="noreferrer"
                className="btn-primary"
              >
                <Download className="h-4 w-4" />
                Download signed PDF
              </a>
            )}
          </div>

          {signedDocUrl && (
            <div className="card overflow-hidden !p-0">
              <iframe
                src={signedDocUrl}
                title={`${row.title} (signed)`}
                className="h-[80vh] w-full rounded-2xl"
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  const { data: urlData, error: urlError } = await supabase.storage
    .from("documents")
    .createSignedUrl(row.original_path, SIGNED_URL_TTL_SECONDS);

  if (urlError || !urlData?.signedUrl) notFound();

  return (
    <SignPdfClient
      token={token}
      title={row.title}
      initialFields={row.fields as Field[]}
      pdfUrl={urlData.signedUrl}
    />
  );
}
