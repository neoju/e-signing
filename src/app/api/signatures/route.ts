import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { MAX_SIGNATURES_PER_USER } from "@/lib/signature-limits";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { SavedSignature } from "@/types/signature";

// Roughly 2MB decoded — plenty for a drawn/typed signature or a reasonably
// sized uploaded image, small enough to keep in a text column.
const MAX_DATA_URL_LENGTH = 3_000_000;

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

export async function GET() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("signatures")
    .select("id, name, image_data_url, is_default, created_at")
    .eq("owner_email", email)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ signatures: (data ?? []).map(toSavedSignature) });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json({ error: "Sign in to save signatures" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const imageDataUrl = body?.imageDataUrl;
  const name = typeof body?.name === "string" && body.name.trim() ? body.name.trim() : "Signature";

  if (typeof imageDataUrl !== "string" || !imageDataUrl.startsWith("data:image/")) {
    return NextResponse.json({ error: "Invalid signature image" }, { status: 400 });
  }
  if (imageDataUrl.length > MAX_DATA_URL_LENGTH) {
    return NextResponse.json({ error: "Signature image is too large" }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();

  const { count } = await supabase
    .from("signatures")
    .select("id", { count: "exact", head: true })
    .eq("owner_email", email);
  if ((count ?? 0) >= MAX_SIGNATURES_PER_USER) {
    return NextResponse.json(
      {
        error: `You can save up to ${MAX_SIGNATURES_PER_USER} signatures. Delete one before adding another.`,
      },
      { status: 409 },
    );
  }
  const isFirst = !count;
  const wantsDefault = body?.isDefault === true || isFirst;

  if (wantsDefault) {
    await supabase
      .from("signatures")
      .update({ is_default: false })
      .eq("owner_email", email);
  }

  const { data, error } = await supabase
    .from("signatures")
    .insert({
      owner_email: email,
      name,
      image_data_url: imageDataUrl,
      is_default: wantsDefault,
    })
    .select("id, name, image_data_url, is_default, created_at")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to save signature" },
      { status: 500 },
    );
  }

  return NextResponse.json({ signature: toSavedSignature(data) });
}
