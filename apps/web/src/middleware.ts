import { NextResponse } from 'next/server'
import type { NextRequest, NextFetchEvent } from 'next/server'

const IS_PUBLIC =
  process.env.NEXT_PUBLIC_SITE_MODE === 'public' ||
  !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

// NOTE: `/share/<token>` is the PUBLIC profile viewer — no account needed — so it
// is deliberately absent here. The owner's share-management UI lives under
// `/dashboard/share`, which stays protected via the `/dashboard` prefix.
const BLOCKED = [
  '/dashboard',
  '/onboarding',
  '/trust-score',
  '/sign-in',
  '/sign-up',
]

export async function middleware(req: NextRequest, event: NextFetchEvent) {
  if (IS_PUBLIC) {
    const p = req.nextUrl.pathname
    if (BLOCKED.some((b) => p === b || p.startsWith(b + '/'))) {
      return NextResponse.redirect(new URL('/', req.url))
    }
    return NextResponse.next()
  }

  const { clerkMiddleware, createRouteMatcher } = await import('@clerk/nextjs/server')
  const isProtected = createRouteMatcher([
    '/dashboard(.*)',
    '/onboarding(.*)',
    '/trust-score(.*)',
  ])
  return clerkMiddleware((auth, r) => {
    if (isProtected(r)) auth().protect()
  })(req, event)
}

export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
}
