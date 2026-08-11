import type { NextConfig } from 'next';

/**
 * broadcastcopy.ai — static export, same deploy shape as apps/web so it can
 * ride the existing rsync pipeline. No basePath: this ships on its own apex
 * domain, not a repo subpath.
 */
const nextConfig: NextConfig = {
  output: 'export',
  // Next 16's flat export writes /download as download.html BESIDE a download/
  // payload directory. Apache's DirectorySlash then 301s /download to
  // /download/, which has no index -> 403 on every subpage. Trailing slashes
  // make each route export as route/index.html, which the docroot's existing
  // .htaccess serves directly.
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
