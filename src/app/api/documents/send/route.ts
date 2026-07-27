import { randomBytes, randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { recordAuditEvent } from "@/lib/audit-log";
import { getClientIp } from "@/lib/request-ip";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  checkUploadQuota,
  pdfTooLarge,
  recordUploadAttempt,
  resolveUploadQuota,
} from "@/lib/upload-limits";
import type { Field } from "@/types/pdf-editor";

// Creates a signature request ready to be sent (i.e. "Generate link" from
// the editor's RecipientAssignBar) — always creates a brand-new row, even
// if the editor was resumed from a saved draft (see AGENTS.md). Unlike POST
// /api/documents, at least one "recipient" field is required.
export async function POST(req: NextRequest) {
  const session = await auth();

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
  const clientIp = getClientIp(req);

  const supabase = createSupabaseAdminClient();

  // Rolling 24h upload cap — guests by IP (low limit), signed-in by email
  // (higher limit). Checked before any storage/DB writes so a throttled
  // request can't leave orphaned rows/objects behind.
  const quota = resolveUploadQuota(ownerEmail, clientIp);
  const quotaResp = await checkUploadQuota(supabase, quota);
  if (quotaResp) return quotaResp;

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

  // Only count against the quota once the row is durably in place — a
  // failed insert already returned above, so we won't double-count on retry.
  await recordUploadAttempt(supabase, quota);

  await recordAuditEvent(supabase, {
    requestId: id,
    eventType: "sent",
    actor: "sender",
    ipAddress: clientIp,
    userAgent: req.headers.get("user-agent"),
  });

  return NextResponse.json({ id, token });
}
