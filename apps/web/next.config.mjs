import { fileURLToPath } from 'node:url'
import { PHASE_DEVELOPMENT_SERVER } from 'next/constants.js'

const localAuthStub = (file) => fileURLToPath(new URL(`./src/lib/local-auth/${file}`, import.meta.url))

/** @returns {import('next').NextConfig} */
export default function nextConfig(phase) {
  // Local auth bypass: swaps Clerk for a fixed local user. Dev server only, so
  // APP_ENV=local has no effect on a production build. See ARCHITECTURE.md §4.
  const localAuthBypass = phase === PHASE_DEVELOPMENT_SERVER && process.env.APP_ENV === 'local'

  const exposedEnv = {}

  if (localAuthBypass) {
    // Non-empty so the app's `hasClerkPublishableKey` checks treat this as an authed build.
    exposedEnv.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'pk_local_auth_bypass'
  } else if (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || process.env.CLERK_PUBLISHABLE_KEY) {
    exposedEnv.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY =
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? process.env.CLERK_PUBLISHABLE_KEY
  }

  return {
    transpilePackages: ['@equiscore/shared'],
    env: exposedEnv,
    webpack(config) {
      if (localAuthBypass) {
        config.resolve.alias = {
          ...config.resolve.alias,
          '@clerk/nextjs$': localAuthStub('clerk-stub.tsx'),
          '@clerk/nextjs/server$': localAuthStub('clerk-server-stub.ts'),
        }
      }
      return config
    },
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
}
