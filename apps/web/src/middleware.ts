import { NextResponse } from 'next/server'
import type { NextRequest, NextFetchEvent } from 'next/server'

const HAS_CLERK = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)
const IS_PUBLIC_MARKETING = process.env.NEXT_PUBLIC_SITE_MODE === 'public'

// NOTE: `/share/<token>` is the PUBLIC profile viewer — no account needed — so it
// is deliberately absent here. The owner's share-management UI lives under
// `/dashboard/share`, which stays protected via the `/dashboard` prefix.
const AUTH_ROUTES = [
  '/admin',
  '/dashboard',
  '/workspace',
  '/onboarding',
  '/trust-score',
  '/sign-in',
  '/sign-up',
]
const PUBLIC_MARKETING_BLOCKED = [
  '/admin',
  '/dashboard',
  '/workspace',
  '/onboarding',
  '/trust-score',
]
const AUTH_PAGE_ROUTES = ['/sign-in', '/sign-up']

function matchesPrefix(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(prefix + '/'))
}

function isAuthPage(pathname: string): boolean {
  return matchesPrefix(pathname, AUTH_PAGE_ROUTES)
}

function isAppRouteHandler(pathname: string): boolean {
  return matchesPrefix(pathname, ['/api', '/trpc'])
}

function requestHost(req: NextRequest): string {
  return (
    (req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? '')
      .split(':')[0]
      ?.toLowerCase() ?? ''
  )
}

function isPartnersHost(req: NextRequest): boolean {
  const host = requestHost(req)
  return host === 'partners.equiscore.app'
}

function isAdminHost(req: NextRequest): boolean {
  const host = requestHost(req)
  return host === 'admin.equiscore.app'
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

function adminRewrite(req: NextRequest): URL | null {
  if (!isAdminHost(req)) return null

  const { pathname } = req.nextUrl
  if (isAuthPage(pathname) || isAppRouteHandler(pathname)) return null

  if (pathname === '/') {
    const url = req.nextUrl.clone()
    url.pathname = '/admin'
    return url
  }

  if (!pathname.startsWith('/admin')) {
    const url = req.nextUrl.clone()
    url.pathname = `/admin${pathname}`
    return url
  }

  return null
}

export async function middleware(req: NextRequest, event: NextFetchEvent) {
  const p = req.nextUrl.pathname
  const rewriteUrl = partnerWorkspaceRewrite(req) ?? adminRewrite(req)
  const isPartnerWorkspacePath =
    isPartnersHost(req) && (p === '/' || p.startsWith('/o/') || p.startsWith('/workspace'))
  const isAdminPath =
    (isAdminHost(req) && !isAuthPage(p) && !isAppRouteHandler(p)) || p.startsWith('/admin')

  if (!HAS_CLERK) {
    if (matchesPrefix(p, AUTH_ROUTES) || isPartnerWorkspacePath || isAdminPath) {
      return NextResponse.redirect(new URL('/', req.url))
    }
    return rewriteUrl ? NextResponse.rewrite(rewriteUrl) : NextResponse.next()
  }

  if (
    IS_PUBLIC_MARKETING &&
    !isPartnersHost(req) &&
    !isAdminHost(req) &&
    matchesPrefix(p, PUBLIC_MARKETING_BLOCKED)
  ) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  const { clerkMiddleware, createRouteMatcher } = await import('@clerk/nextjs/server')
  const isProtected = createRouteMatcher([
    '/dashboard(.*)',
    '/workspace(.*)',
    '/admin(.*)',
    '/onboarding(.*)',
    '/trust-score(.*)',
  ])
  return clerkMiddleware((auth, r) => {
    if (isProtected(r) || isPartnerWorkspacePath || isAdminPath) auth().protect()
    if (rewriteUrl) return NextResponse.rewrite(rewriteUrl)
    return NextResponse.next()
  })(req, event)
}

export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
}
