import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { OwnedRequestSummary } from "@/types/signature-request";

const SIGNED_URL_TTL_SECONDS = 60 * 10;

// Lists every sent request owned by the signed-in user, for the
// "Your Documents" dashboard.
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
