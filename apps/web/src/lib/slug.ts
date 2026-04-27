/**
 * Tiny, deterministic slugifier — used for wiki entity links so the
 * client and the (future) auto-research agent agree on URLs.
 *
 * Lowercase, ASCII-fold via NFKD strip, collapse non-alphanumerics to "-",
 * strip leading/trailing hyphens.
 */
export function slugify(input: string): string {
  if (!input) return "";
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
