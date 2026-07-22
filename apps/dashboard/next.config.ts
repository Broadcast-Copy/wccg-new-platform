import type { NextConfig } from 'next';

/**
 * app.broadcastcopy.ai — the GM/OM control plane. Static export + client-side
 * Supabase auth (same shape as apps/web and apps/marketing), served on its own
 * host, so no basePath.
 */
const nextConfig: NextConfig = {
  output: 'export',
  images: { unoptimized: true },
};

export default nextConfig;
