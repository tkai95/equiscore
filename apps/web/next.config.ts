import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@equiscore/shared'],
  experimental: {
    typedRoutes: true,
  },
}

export default nextConfig
