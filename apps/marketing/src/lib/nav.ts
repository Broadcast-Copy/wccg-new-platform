/**
 * The site's navigation, declared once so the header, the phone menu and the
 * footer cannot drift apart. Order is the owner's (2026-09-27): Download,
 * Developers, Documentation, Support, then the waitlist button, then Log in /
 * the profile circle. Trailing slashes match the export (`trailingSlash`), so
 * no link costs a redirect on Apache.
 */
export const NAV_LINKS = [
  { href: "/download/", label: "Download" },
  { href: "/developers/", label: "Developers" },
  { href: "/documentation/", label: "Documentation" },
  { href: "/support/", label: "Support" },
] as const;

/** The one call to action. Inquiries, including pricing, go through it. */
export const WAITLIST_HREF = "/platform/#early-access";

/** Everything else the footer carries (the changelog lives here now). */
export const FOOTER_LINKS = [
  { href: "/platform/", label: "Platform" },
  { href: "/", label: "Station tour" },
  { href: "/changelog/", label: "Changelog" },
  { href: "/product-sheet/", label: "Product sheet" },
] as const;

/** "/download/" and "/download" name the same page. */
export function samePath(a: string, b: string): boolean {
  const norm = (p: string) => (p.length > 1 ? p.replace(/\/+$/, "") : p);
  return norm(a) === norm(b);
}
