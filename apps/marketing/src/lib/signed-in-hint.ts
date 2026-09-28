/**
 * Whether the visitor is signed in to the platform - a HINT, never proof.
 *
 * The platform (platform.broadcastcopy.ai, apps/dashboard) keeps its Supabase
 * session in its own localStorage, which this site cannot read and must not
 * try to. On every auth change the platform also writes ONE small cookie,
 * scoped to .broadcastcopy.ai, that holds nothing but up to two initials ("1"
 * when it has none): no token, no email, nothing that authorises anything. The
 * platform deletes it on sign-out, and it expires 7 days after the last
 * platform visit. Jev chose this design (0.93, 2026-09-27) over moving the
 * session itself into a shared cookie, an iframe bridge, or no detection.
 *
 * A stale or hand-made hint only changes what this header shows: the circle
 * links to the platform, whose AuthGuard sends anyone not signed in to /login.
 *
 * Keep the name and the format in step with
 * apps/dashboard/src/lib/signed-in-hint.ts, which writes it.
 */
export const HINT_COOKIE = "bc_signed_in";

/**
 * Reads the hint out of a Cookie string (document.cookie).
 * null = not signed in (or a value this site does not recognise),
 * ""   = signed in, no initials,
 * "AB" = signed in, with these initials.
 */
export function parseHint(cookies: string): string | null {
  for (const part of cookies.split(";")) {
    const eq = part.indexOf("=");
    if (eq < 0 || part.slice(0, eq).trim() !== HINT_COOKIE) continue;
    const value = part.slice(eq + 1).trim();
    if (value === "1") return "";
    return /^[A-Z0-9]{1,2}$/.test(value) ? value : null;
  }
  return null;
}
