import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone', // necessário para Dockerfile
  experimental: {
    // server actions já é estável no Next 16
  },
  poweredByHeader: false,
};

export default nextConfig;
