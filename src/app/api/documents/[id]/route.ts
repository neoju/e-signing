import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { pdfTooLarge } from "@/lib/upload-limits";
import type { Field } from "@/types/pdf-editor";

const SIGNED_URL_TTL_SECONDS = 60 * 15;

// Two things live behind this one route, distinguished by ownership/status:
//  - Anyone holding the (unguessable) id gets a lightweight status payload
//    (id/title/token/status/signedUrl) — this is how the sent-requests list
//    polls for both logged-in and anonymous senders.
//  - The signed-in owner of a still-in-progress draft additionally gets the
//    full editable payload (fields/pdfUrl) so the editor can resume it.
// A draft's content is otherwise private: non-owners get 404 for it.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  const email = session?.user?.email ?? null;

  const { id } = await params;
  const supabase = createSupabaseAdminClient();
  const { data: row, error } = await supabase
    .from("signature_requests")
    .select("id, title, token, original_path, signed_path, fields, status, owner_email")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const isOwner = Boolean(email && row?.owner_email === email);
  if (!row || (row.status === "draft" && !isOwner)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let signedUrl: string | null = null;
  if (row.status === "completed" && row.signed_path) {
    const { data: urlData } = await supabase.storage
      .from("documents")
      .createSignedUrl(row.signed_path, SIGNED_URL_TTL_SECONDS);
    signedUrl = urlData?.signedUrl ?? null;
  }

  const payload: {
    id: string;
    title: string;
    token: string;
    status: string;
    signedUrl: string | null;
    fields?: Field[];
    pdfUrl?: string;
  } = {
    id: row.id,
    title: row.title,
    token: row.token,
    status: row.status,
    signedUrl,
  };

  if (row.status === "draft" && isOwner) {
    const { data: urlData, error: urlError } = await supabase.storage
      .from("documents")
      .createSignedUrl(row.original_path, SIGNED_URL_TTL_SECONDS);
    if (urlError || !urlData?.signedUrl) {
      return NextResponse.json({ error: "Failed to load document" }, { status: 500 });
    }
    payload.fields = row.fields;
    payload.pdfUrl = urlData.signedUrl;
  }

  return NextResponse.json(payload);
}

// Overwrites a draft's PDF/fields/title in place (re-saving from the editor).
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json({ error: "Sign in to save documents" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createSupabaseAdminClient();
  const { data: row, error: fetchError } = await supabase
    .from("signature_requests")
    .select("id, original_path, owner_email, status")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }
  if (!row || row.owner_email !== email || row.status !== "draft") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
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

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await supabase.storage
    .from("documents")
    .upload(row.original_path, buffer, {
      contentType: "application/pdf",
      upsert: true,
    });
  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { error: updateError } = await supabase
    .from("signature_requests")
    .update({ title, fields })
    .eq("id", id);
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ id: row.id });
}
