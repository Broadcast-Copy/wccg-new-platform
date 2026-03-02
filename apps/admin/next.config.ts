import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // No output: 'export' — admin uses SSR/SSG normally
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  transpilePackages: ['@wccg/types'],
};

export default nextConfig;
