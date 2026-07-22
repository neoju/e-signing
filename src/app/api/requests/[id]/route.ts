import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const SIGNED_URL_TTL_SECONDS = 60 * 10;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createSupabaseAdminClient();

  const { data: row, error } = await supabase
    .from("signature_requests")
    .select("id, title, token, status, signed_path")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let signedUrl: string | null = null;
  if (row.status === "completed" && row.signed_path) {
    const { data: urlData } = await supabase.storage
      .from("documents")
      .createSignedUrl(row.signed_path, SIGNED_URL_TTL_SECONDS);
    signedUrl = urlData?.signedUrl ?? null;
  }

  return NextResponse.json({
    id: row.id,
    title: row.title,
    token: row.token,
    status: row.status,
    signedUrl,
  });
}
