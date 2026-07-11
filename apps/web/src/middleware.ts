import { NextResponse } from 'next/server'
import type { NextRequest, NextFetchEvent } from 'next/server'

const HAS_CLERK = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)
const IS_PUBLIC_MARKETING = process.env.NEXT_PUBLIC_SITE_MODE === 'public'

// NOTE: `/share/<token>` is the PUBLIC profile viewer — no account needed — so it
// is deliberately absent here. The owner's share-management UI lives under
// `/dashboard/share`, which stays protected via the `/dashboard` prefix.
const AUTH_ROUTES = ['/dashboard', '/workspace', '/onboarding', '/trust-score', '/sign-in', '/sign-up']
const PUBLIC_MARKETING_BLOCKED = ['/dashboard', '/workspace', '/onboarding', '/trust-score']

function matchesPrefix(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(prefix + '/'))
}

function requestHost(req: NextRequest): string {
  return (req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? '').split(':')[0]?.toLowerCase() ?? ''
}

function isPartnersHost(req: NextRequest): boolean {
  const host = requestHost(req)
  return host === 'partners.equiscore.app'
}

function partnerWorkspaceRewrite(req: NextRequest): URL | null {
  if (!isPartnersHost(req)) return null

  const { pathname } = req.nextUrl
  if (pathname === '/') {
    const url = req.nextUrl.clone()
    url.pathname = '/workspace'
    return url
  }

  if (pathname.startsWith('/o/')) {
    const url = req.nextUrl.clone()
    url.pathname = `/workspace${pathname}`
    return url
  }

  return null
}

export async function middleware(req: NextRequest, event: NextFetchEvent) {
  const p = req.nextUrl.pathname
  const rewriteUrl = partnerWorkspaceRewrite(req)
  const isPartnerWorkspacePath = isPartnersHost(req) && (p === '/' || p.startsWith('/o/') || p.startsWith('/workspace'))

  if (!HAS_CLERK) {
    if (matchesPrefix(p, AUTH_ROUTES) || isPartnerWorkspacePath) {
      return NextResponse.redirect(new URL('/', req.url))
    }
    return rewriteUrl ? NextResponse.rewrite(rewriteUrl) : NextResponse.next()
  }

  if (IS_PUBLIC_MARKETING && !isPartnersHost(req) && matchesPrefix(p, PUBLIC_MARKETING_BLOCKED)) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  const { clerkMiddleware, createRouteMatcher } = await import('@clerk/nextjs/server')
  const isProtected = createRouteMatcher([
    '/dashboard(.*)',
    '/workspace(.*)',
    '/onboarding(.*)',
    '/trust-score(.*)',
  ])
  return clerkMiddleware((auth, r) => {
    if (isProtected(r) || isPartnerWorkspacePath) auth().protect()
    if (rewriteUrl) return NextResponse.rewrite(rewriteUrl)
    return NextResponse.next()
  })(req, event)
}

export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
}
