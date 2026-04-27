import { createBrowserClient } from "@supabase/ssr";

/**
 * Create a Supabase client for use in the browser (Client Components).
 *
 * This client uses the anon/public key and relies on RLS policies
 * for authorization. It is safe to use in client-side code.
 */
export function createClient() {
  // Placeholders prevent static-export prerender crashes when CI secrets
  // aren't wired yet. Runtime queries with these fail loudly, which is what
  // we want — vs. the build collapsing.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";
  return createBrowserClient(url, key);
}
