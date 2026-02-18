import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@wccg/types', '@wccg/ui'],
};

export default nextConfig;
