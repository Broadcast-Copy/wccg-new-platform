/** Legacy WordPress uploads removed during the static-site migration. */
const MISSING_UPLOADS = new Set([
  "/wp-content/uploads/2025/09/bootleg-kev-new1.png",
  "/wp-content/uploads/2025/09/streetz.png",
  "/wp-content/uploads/2025/11/attachment-thumbnail_new-streetz-pix.png",
  "/wp-content/uploads/2025/11/GAxhqlAXcAAPZOQ.jpg",
]);

/** Keep current CMS artwork; replace only audited missing station uploads with
 * that same show's/host's bundled artwork. No image is preferable to a guessed
 * person when the curated record has no replacement. No network or DB writes. */
export function contentImage(
  source: string | null,
  bundled: string | null | undefined,
): string | null {
  if (!source) return source;
  try {
    const url = new URL(source, "https://wccg1045fm.com");
    if (
      ["https:", "http:"].includes(url.protocol) &&
      ["wccg1045fm.com", "www.wccg1045fm.com"].includes(url.hostname) &&
      !url.port && !url.username && !url.password &&
      MISSING_UPLOADS.has(url.pathname)
    ) return bundled ?? null;
  } catch { /* Unrecognized CMS value is outside this targeted repair. */ }
  return source;
}
