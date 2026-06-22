/**
 * Canonical public site URL — single source of truth for metadata/canonical
 * links, share URLs, and OpenGraph tags.
 *
 * APEX CUTOVER: when KnownHost points wccg1045fm.com at this site, flip this in
 * ONE place — set NEXT_PUBLIC_SITE_URL in the deploy workflow (or change the
 * fallback below) to "https://wccg1045fm.com". Everything else follows.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://wccg1045fm.com"
).replace(/\/+$/, "");

/** Bare host (no protocol), e.g. for display like "wccg1045fm.com/u/handle". */
export const SITE_HOST = SITE_URL.replace(/^https?:\/\//, "");
