import { createClient } from "@supabase/supabase-js";

/**
 * Public-by-design fallbacks (same pattern as apps/web). The project URL and
 * the `sb_publishable_*` key ship in every client bundle and are RLS-protected:
 * anon may INSERT a lead and nothing else. Never put a service-role key here.
 */
const FALLBACK_SUPABASE_URL = "https://irjiqbmoohklagdegezz.supabase.co";
const FALLBACK_SUPABASE_ANON_KEY = "sb_publishable_w9EytFGBM7mEvefmGhsZ9w_bXbmNjQ4";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_SUPABASE_ANON_KEY,
);
