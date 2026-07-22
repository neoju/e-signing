import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const supabase = createSupabaseAdminClient();

  const { data: rows, error: lookupError } = await supabase.rpc(
    "get_request_by_token",
    { t: token },
  );
  const requestRow = rows?.[0];
  if (lookupError || !requestRow) {
    return NextResponse.json(
      { error: "Request not found or already completed" },
      { status: 404 },
    );
  }

  const formData = await req.formData();
  const file = formData.get("file");
  const fieldsRaw = formData.get("fields");
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "Missing signed PDF" }, { status: 400 });
  }

  let fields = requestRow.fields;
  if (typeof fieldsRaw === "string") {
    try {
      fields = JSON.parse(fieldsRaw);
    } catch {
      return NextResponse.json({ error: "Invalid fields payload" }, { status: 400 });
    }
  }

  const signedPath = `${requestRow.id}/signed.pdf`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await supabase.storage
    .from("documents")
    .upload(signedPath, buffer, { contentType: "application/pdf", upsert: true });
  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { error: completeError } = await supabase.rpc("complete_request", {
    t: token,
    p_signed_path: signedPath,
    p_fields: fields,
  });
  if (completeError) {
    return NextResponse.json({ error: completeError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
