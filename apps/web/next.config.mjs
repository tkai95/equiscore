/** @type {import('next').NextConfig} */
const exposedEnv = {}

if (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || process.env.CLERK_PUBLISHABLE_KEY) {
  exposedEnv.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY =
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? process.env.CLERK_PUBLISHABLE_KEY
}

const nextConfig = {
  transpilePackages: ['@equiscore/shared'],
  env: exposedEnv,
  async rewrites() {
    return [
      {
        source: '/ingest/static/:path*',
        destination: 'https://eu-assets.i.posthog.com/static/:path*',
      },
      {
        source: '/ingest/:path*',
        destination: 'https://eu.i.posthog.com/:path*',
      },
    ]
  },
}

export default nextConfig
