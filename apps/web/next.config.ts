import type { NextConfig } from 'next';

const basePath = process.env.GITHUB_PAGES === 'true' ? '/wccg-new-platform' : '';

const nextConfig: NextConfig = {
  output: 'export',
  basePath,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'wccg1045fm.com',
      },
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
      },
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
      },
    ],
  },
  transpilePackages: ['@wccg/types', '@wccg/ui'],
};

export default nextConfig;
