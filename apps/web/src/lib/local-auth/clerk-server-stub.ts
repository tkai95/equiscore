// ─── Local auth bypass: stand-in for `@clerk/nextjs/server` ──────────────────
// next.config.mjs aliases `@clerk/nextjs/server` to this file ONLY under
// `next dev` with APP_ENV=local. It is never part of a production build. See
// docs/ARCHITECTURE.md §4.
import { NextResponse } from 'next/server'
import type { NextFetchEvent, NextRequest } from 'next/server'

const authResult = {
  userId: 'local_dev_user',
  sessionId: 'local_dev_session',
  protect: () => authResult,
}

export const auth = () => authResult

export const createRouteMatcher = (_routes: string[]) => (_req: NextRequest) => true

type MiddlewareHandler = (
  authFn: typeof auth,
  req: NextRequest
) => NextResponse | void | Promise<NextResponse | void>

export const clerkMiddleware =
  (handler: MiddlewareHandler) => async (req: NextRequest, _event: NextFetchEvent) =>
    (await handler(auth, req)) ?? NextResponse.next()
