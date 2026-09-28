import { createClient } from "@supabase/supabase-js";
import { writeSignedInHint } from "@/lib/signed-in-hint";

/**
 * Browser Supabase client for the control plane. Public-by-design fallbacks
 * (same as apps/web and apps/marketing): the project URL + sb_publishable_* key
 * ship in the bundle and are RLS-protected. Auth session persists client-side
 * (this is a static export — no server session). Never put a service key here.
 */
const FALLBACK_SUPABASE_URL = "https://irjiqbmoohklagdegezz.supabase.co";
const FALLBACK_SUPABASE_ANON_KEY = "sb_publishable_w9EytFGBM7mEvefmGhsZ9w_bXbmNjQ4";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_SUPABASE_ANON_KEY,
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } },
);

// Keep broadcastcopy.ai's "signed in" hint (initials only, never a token) in
// step with this session: written on every auth event, deleted on sign-out.
// The session itself stays in localStorage. See lib/signed-in-hint.ts.
if (typeof window !== "undefined") {
  supabase.auth.onAuthStateChange((_event, session) => writeSignedInHint(session));
}
