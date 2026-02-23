/**
 * Returns the basePath for the current environment.
 * On GitHub Pages (GITHUB_PAGES=true), this is '/wccg-new-platform'.
 * In local development, this is ''.
 *
 * Uses NEXT_PUBLIC_BASE_PATH which is set in next.config.ts via env.
 */
export function getBasePath(): string {
  return process.env.NEXT_PUBLIC_BASE_PATH ?? "";
}

/**
 * Prefix a local asset path with the basePath.
 * Only prefixes paths starting with '/'.
 * Absolute URLs (http://, https://) are returned as-is.
 */
export function assetPath(path: string): string {
  if (!path) return path;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const base = getBasePath();
  if (base && path.startsWith("/")) {
    return `${base}${path}`;
  }
  return path;
}
