import { randomBytes, randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Field } from "@/types/pdf-editor";

// Creates a signature request ready to be sent (i.e. "Generate link" from
// the editor's RecipientAssignBar). If a session cookie is present, the row
// is stamped with `owner_email` so the sender can see it on `/documents`
// across devices; anonymous sends leave `owner_email` NULL.
export async function POST(req: NextRequest) {
  const session = await auth();

  const formData = await req.formData();
  const file = formData.get("file");
  const title = String(formData.get("title") ?? "Untitled document");
  const fieldsRaw = formData.get("fields");

  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "Missing PDF file" }, { status: 400 });
  }
  if (typeof fieldsRaw !== "string") {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  let fields: Field[];
  try {
    fields = JSON.parse(fieldsRaw);
  } catch {
    return NextResponse.json({ error: "Invalid fields payload" }, { status: 400 });
  }
  if (!Array.isArray(fields) || fields.length === 0) {
    return NextResponse.json({ error: "At least one field is required" }, { status: 400 });
  }
  if (!fields.some((f) => f.assignee === "recipient")) {
    return NextResponse.json(
      { error: "Mark at least one area for the next signer" },
      { status: 400 },
    );
  }
  // Recipient fields must always start blank — the sender's own (already
  // filled) fields are kept as-is so the next signer can see them.
  const preparedFields = fields.map((f) =>
    f.assignee === "recipient" ? { ...f, value: "" } : f,
  );

  const id = randomUUID();
  const token = randomBytes(24).toString("base64url");
  const originalPath = `${id}/original.pdf`;
  const ownerEmail = session?.user?.email ?? null;

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
    fields: preparedFields,
    owner_email: ownerEmail,
  });
  if (insertError) {
    await supabase.storage.from("documents").remove([originalPath]);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ id, token });
}
