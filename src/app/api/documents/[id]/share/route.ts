import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hashPassword } from "@/lib/password";

// Current sharing settings for a draft, for populating the share dialog.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createSupabaseAdminClient();
  const { data: row, error } = await supabase
    .from("signature_requests")
    .select("id, owner_email, status, token, share_enabled, share_password_hash")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!row || row.owner_email !== email || row.status !== "draft") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    token: row.token,
    shareEnabled: row.share_enabled,
    hasPassword: Boolean(row.share_password_hash),
  });
}

// Updates sharing settings. Body: { enabled: boolean, password?: string | null }.
// `password` omitted -> leave the existing password (if any) unchanged.
// `password: null` -> remove any password requirement.
// `password: "..."` -> set/replace the password.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createSupabaseAdminClient();
  const { data: row, error: fetchError } = await supabase
    .from("signature_requests")
    .select("id, owner_email, status")
    .eq("id", id)
    .maybeSingle();
  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }
  if (!row || row.owner_email !== email || row.status !== "draft") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const enabled = Boolean(body?.enabled);
  const patch: { share_enabled: boolean; share_password_hash?: string | null } = {
    share_enabled: enabled,
  };

  if (!enabled) {
    patch.share_password_hash = null;
  } else if (body && Object.prototype.hasOwnProperty.call(body, "password")) {
    const pw = body.password;
    if (pw === null) {
      patch.share_password_hash = null;
    } else if (typeof pw === "string" && pw.length > 0) {
      if (pw.length > 200) {
        return NextResponse.json({ error: "Password is too long" }, { status: 400 });
      }
      patch.share_password_hash = hashPassword(pw);
    }
  }

  const { error: updateError } = await supabase
    .from("signature_requests")
    .update(patch)
    .eq("id", id);
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const { data: updated, error: refetchError } = await supabase
    .from("signature_requests")
    .select("token, share_enabled, share_password_hash")
    .eq("id", id)
    .single();
  if (refetchError || !updated) {
    return NextResponse.json(
      { error: refetchError?.message ?? "Failed to load updated settings" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    token: updated.token,
    shareEnabled: updated.share_enabled,
    hasPassword: Boolean(updated.share_password_hash),
  });
}
