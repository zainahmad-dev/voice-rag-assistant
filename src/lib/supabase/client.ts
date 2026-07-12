import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Browser-safe: uses the public anon key. Only used to PUT file bytes
// straight to Supabase Storage via a signed upload URL minted by
// /api/upload — never for querying tables directly.
let browserClient: SupabaseClient | null = null;

export function getSupabaseBrowserClient(): SupabaseClient {
  if (browserClient) return browserClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables."
    );
  }

  browserClient = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  return browserClient;
}
