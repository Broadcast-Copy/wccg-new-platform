import type { Session, User } from "@supabase/supabase-js";

/**
 * The "signed in" HINT for broadcastcopy.ai's header - never a credential.
 *
 * The marketing site (broadcastcopy.ai) is a separate static export and cannot
 * read this app's session, which stays exactly where it was: in this origin's
 * localStorage, untouched by this file. So that its header can show a profile
 * circle instead of "Log in", this app also keeps ONE small cookie, scoped to
 * .broadcastcopy.ai, holding nothing but up to two initials ("1" when there are
 * none). No token, no email, no user id: reading it grants nothing, and a
 * forged one only changes what the marketing header draws - its circle links
 * here, where AuthGuard still decides.
 *
 * Written on every auth event (initial session, sign-in, token refresh) with a
 * 7-day lifetime, so it outlives the tab but not a week away; deleted on
 * sign-out. Jev chose this design (0.93, 2026-09-27) over moving the session
 * into a shared cookie, an iframe bridge, or no detection.
 *
 * Keep the name and format in step with apps/marketing/src/lib/signed-in-hint.ts.
 */
export const HINT_COOKIE = "bc_signed_in";
const MAX_AGE_SECONDS = 7 * 24 * 60 * 60;
const SITE = "broadcastcopy.ai";

/** Up to two letters or digits for the circle: "Jane Carson" -> "JC", gm@x -> "G". */
export function initialsOf(user: Pick<User, "email" | "user_metadata">): string {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const named = [meta.full_name, meta.name].find((v): v is string => typeof v === "string" && v.trim() !== "");
  const source = named ?? (user.email ?? "").split("@")[0] ?? "";
  const words = source
    .replace(/[._+-]+/g, " ")
    .normalize("NFD")
    .replace(/[^A-Za-z0-9 ]/g, "")
    .split(/\s+/)
    .filter(Boolean);
  const first = words[0]?.charAt(0) ?? "";
  const last = words.length > 1 ? (words[words.length - 1]?.charAt(0) ?? "") : "";
  return (first + last).toUpperCase();
}

/** The cookie's scope: the whole site in production, this host anywhere else. */
function attributes(): string {
  const host = window.location.hostname;
  const domain = host === SITE || host.endsWith(`.${SITE}`) ? `; Domain=.${SITE}` : "";
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  return `; Path=/; SameSite=Lax${domain}${secure}`;
}

export function writeSignedInHint(session: Session | null): void {
  if (typeof document === "undefined") return;
  try {
    document.cookie = session
      ? `${HINT_COOKIE}=${initialsOf(session.user) || "1"}; Max-Age=${MAX_AGE_SECONDS}${attributes()}`
      : `${HINT_COOKIE}=; Max-Age=0${attributes()}`;
  } catch {
    // a blocked cookie jar only costs the marketing header its circle
  }
}
