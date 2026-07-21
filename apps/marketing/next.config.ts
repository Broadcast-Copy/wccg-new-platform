import type { NextConfig } from 'next';

/**
 * broadcastcopy.ai — static export, same deploy shape as apps/web so it can
 * ride the existing rsync pipeline. No basePath: this ships on its own apex
 * domain, not a repo subpath.
 */
const nextConfig: NextConfig = {
  output: 'export',
  images: { unoptimized: true },
};

export default nextConfig;
