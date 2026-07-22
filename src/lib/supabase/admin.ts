import { createClient } from "@supabase/supabase-js";

// Service-role client — bypasses RLS. Import this ONLY from server-side code
// (route handlers / server components under src/app/api and src/app/sign,
// src/app/requests). Never import from a "use client" component.
export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars",
    );
  }
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
}
