import { createBrowserClient } from "@supabase/ssr";

/**
 * Create a Supabase client for use in the browser (Client Components).
 *
 * This client uses the anon/public key and relies on RLS policies
 * for authorization. It is safe to use in client-side code.
 */
// Public-by-design fallbacks. The project URL ships in every client bundle
// and sb_publishable_* is Supabase's publishable client key (protected by
// RLS). Using the real values as the fallback means the app works even if
// NEXT_PUBLIC_SUPABASE_* aren't wired into the build env — which is what
// caused the "Failed to fetch" login bug when the bundle shipped pointing
// at a non-existent placeholder domain.
const FALLBACK_SUPABASE_URL = "https://irjiqbmoohklagdegezz.supabase.co";
const FALLBACK_SUPABASE_ANON_KEY = "sb_publishable_w9EytFGBM7mEvefmGhsZ9w_bXbmNjQ4";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_SUPABASE_ANON_KEY;
  return createBrowserClient(url, key);
}
