import { randomBytes, randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { pdfTooLarge } from "@/lib/upload-limits";
import type { Field } from "@/types/pdf-editor";
import type { OwnedRequestSummary } from "@/types/signature-request";

const SIGNED_URL_TTL_SECONDS = 60 * 10;

// Saves the document currently open in the editor as a draft, so a
// signed-in user can come back and continue later. Unlike POST
// /api/documents/send, no "recipient" field is required — a draft doesn't
// need to be ready to send yet.
export async function POST(req: NextRequest) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json({ error: "Sign in to save documents" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file");
  const title = String(formData.get("title") ?? "Untitled document");
  const fieldsRaw = formData.get("fields");

  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "Missing PDF file" }, { status: 400 });
  }
  const sizeErr = pdfTooLarge(file);
  if (sizeErr) return sizeErr;
  if (typeof fieldsRaw !== "string") {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  let fields: Field[];
  try {
    fields = JSON.parse(fieldsRaw);
  } catch {
    return NextResponse.json({ error: "Invalid fields payload" }, { status: 400 });
  }
  if (!Array.isArray(fields)) {
    return NextResponse.json({ error: "Invalid fields payload" }, { status: 400 });
  }

  const id = randomUUID();
  const token = randomBytes(24).toString("base64url");
  const originalPath = `${id}/original.pdf`;

  const supabase = createSupabaseAdminClient();
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from("documents")
    .upload(originalPath, buffer, { contentType: "application/pdf" });
  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { error: insertError } = await supabase.from("signature_requests").insert({
    id,
    title,
    original_path: originalPath,
    token,
    fields,
    owner_email: email,
    status: "draft",
  });
  if (insertError) {
    await supabase.storage.from("documents").remove([originalPath]);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ id });
}

// Lists every draft/pending/completed document owned by the signed-in user,
// for the "Your Documents" dashboard.
export async function GET() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("signature_requests")
    .select("id, title, token, status, signed_path, created_at")
    .eq("owner_email", email)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = data ?? [];
  const summaries: OwnedRequestSummary[] = await Promise.all(
    rows.map(async (row) => {
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
        status: row.status,
        createdAt: row.created_at,
        signedUrl,
      };
    }),
  );

  return NextResponse.json({ requests: summaries });
}
