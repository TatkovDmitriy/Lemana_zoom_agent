import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@lemana/shared'],
  experimental: {
    typedRoutes: true,
  },
};

export default nextConfig;
