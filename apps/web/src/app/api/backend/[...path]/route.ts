import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

type RouteContext = {
  params: {
    path?: string[]
  }
}

const LOCAL_API_URL = 'http://localhost:4000/api/v1'

function backendApiUrl(): string {
  return (process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? LOCAL_API_URL).replace(
    /\/+$/,
    ''
  )
}

function targetUrl(request: NextRequest, path: string[]): URL {
  const url = new URL(`${backendApiUrl()}/${path.map(encodeURIComponent).join('/')}`)
  url.search = request.nextUrl.search
  return url
}

function proxiedRequestHeaders(request: NextRequest): Headers {
  const headers = new Headers(request.headers)
  headers.delete('host')
  headers.delete('connection')
  headers.delete('content-length')
  // This is a trusted server-to-server proxy. Forwarding the browser Origin
  // makes the API run its CORS browser checks against admin/partners hosts.
  headers.delete('origin')
  return headers
}

function proxiedResponseHeaders(response: Response): Headers {
  const headers = new Headers(response.headers)
  headers.delete('content-encoding')
  headers.delete('content-length')
  headers.delete('connection')
  headers.delete('transfer-encoding')
  return headers
}

async function proxy(request: NextRequest, { params }: RouteContext): Promise<Response> {
  try {
    const url = targetUrl(request, params.path ?? [])
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return NextResponse.json({ message: 'API_URL must be an HTTP(S) URL' }, { status: 500 })
    }

    const method = request.method.toUpperCase()
    const init: RequestInit & { duplex?: 'half' } = {
      method,
      headers: proxiedRequestHeaders(request),
      redirect: 'manual',
      cache: 'no-store',
    }

    if (method !== 'GET' && method !== 'HEAD') {
      init.body = request.body
      init.duplex = 'half'
    }

    const response = await fetch(url, init)
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: proxiedResponseHeaders(response),
    })
  } catch (error) {
    console.error('Backend proxy error:', error)
    return NextResponse.json({ message: 'Unable to reach backend API' }, { status: 502 })
  }
}

export const GET = proxy
export const POST = proxy
export const PUT = proxy
export const PATCH = proxy
export const DELETE = proxy
