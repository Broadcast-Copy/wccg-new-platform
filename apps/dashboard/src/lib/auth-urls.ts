/**
 * Where Supabase Auth sends someone back to after an e-mailed link.
 *
 * Supabase only honours a redirect that is on the project's allow list
 * (Authentication -> URL Configuration -> Redirect URLs); anything else falls
 * back to the Site URL. So this never uses an arbitrary origin: production is
 * always the canonical host, and only a local dev server (localhost /
 * 127.0.0.1, any port) redirects to itself.
 */
export const PLATFORM_ORIGIN = "https://platform.broadcastcopy.ai";

export const RESET_PATH = "/reset-password/";

function isLocalDev(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

/** redirectTo for resetPasswordForEmail. */
export function resetRedirectUrl(): string {
  if (typeof window !== "undefined" && isLocalDev(window.location.hostname)) {
    return `${window.location.origin}${RESET_PATH}`;
  }
  return `${PLATFORM_ORIGIN}${RESET_PATH}`;
}
