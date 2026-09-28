/**
 * Where to go after signing in. A visitor sent to /login from a guarded page
 * carries ?next=<the page they asked for>, so a link to /docs?d=... lands on
 * that guide after sign-in instead of the home page.
 *
 * Only a same-site path is accepted: it must start with a single "/", with no
 * "//" or "/\" (which browsers treat as another host), no backslash, no
 * whitespace or control character, and not point back at the auth pages.
 * Anything else falls back to "/" - this is never an open redirect.
 */
export function safeNextPath(raw: string | null | undefined): string {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > 512) return "/";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/";
  for (let i = 0; i < raw.length; i++) {
    const code = raw.charCodeAt(i);
    if (code <= 0x20 || code === 0x5c || (code >= 0x7f && code <= 0x9f)) return "/";
  }
  if (/^\/(login|signup)(?:[/?#]|$)/.test(raw)) return "/";
  return raw;
}

/** The ?next= value in the current address, made safe. Browser only. */
export function nextFromLocation(): string {
  if (typeof window === "undefined") return "/";
  return safeNextPath(new URLSearchParams(window.location.search).get("next"));
}

/** /login, carrying the current page as ?next= when it is not the home page. */
export function loginHref(): string {
  if (typeof window === "undefined") return "/login";
  const here = safeNextPath(window.location.pathname + window.location.search);
  return here === "/" ? "/login" : `/login?next=${encodeURIComponent(here)}`;
}
