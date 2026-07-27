import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { SavedSignature } from "@/types/signature";

function toSavedSignature(row: {
  id: string;
  name: string;
  image_data_url: string;
  is_default: boolean;
  created_at: string;
}): SavedSignature {
  return {
    id: row.id,
    name: row.name,
    imageDataUrl: row.image_data_url,
    isDefault: row.is_default,
    createdAt: row.created_at,
  };
}

export async function PATCH(
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

  const { data: existing, error: fetchError } = await supabase
    .from("signatures")
    .select("id, owner_email")
    .eq("id", id)
    .maybeSingle();
  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }
  if (!existing || existing.owner_email !== email) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const patch: { name?: string; is_default?: boolean } = {};
  if (typeof body?.name === "string" && body.name.trim()) {
    patch.name = body.name.trim();
  }
  if (body?.isDefault === true) {
    await supabase.from("signatures").update({ is_default: false }).eq("owner_email", email);
    patch.is_default = true;
  }

  const { data, error } = await supabase
    .from("signatures")
    .update(patch)
    .eq("id", id)
    .select("id, name, image_data_url, is_default, created_at")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to update signature" },
      { status: 500 },
    );
  }

  return NextResponse.json({ signature: toSavedSignature(data) });
}

export async function DELETE(
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

  const { data: existing, error: fetchError } = await supabase
    .from("signatures")
    .select("id, owner_email")
    .eq("id", id)
    .maybeSingle();
  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }
  if (!existing || existing.owner_email !== email) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { error } = await supabase.from("signatures").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
