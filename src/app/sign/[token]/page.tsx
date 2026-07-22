import { notFound } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
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
    .select("id, title, original_path, fields, status")
    .eq("token", token)
    .maybeSingle();

  if (!row) notFound();

  if (row.status === "completed") {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-bg p-6">
        <div className="card w-full max-w-md text-center">
          <CheckCircle2 className="mx-auto mb-4 h-10 w-10 text-accent" />
          <h2 className="mb-2 text-xl font-semibold">Already signed</h2>
          <p className="text-sm text-muted">
            &ldquo;{row.title}&rdquo; has already been signed. This link can only be
            used once.
          </p>
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
