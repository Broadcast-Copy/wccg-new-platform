import { createBrowserClient } from "@supabase/ssr";

/**
 * Create a Supabase client for use in the browser (Client Components).
 *
 * This client uses the anon/public key and relies on RLS policies
 * for authorization. It is safe to use in client-side code.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
