const DEFAULT_CONSUMER_APP_URL = 'https://dev.equiscore.app'
const DEFAULT_ADMIN_APP_URL = 'https://admin.equiscore.app'
const DEFAULT_PARTNER_APP_URL = 'https://partners.equiscore.app'
const PARTNER_HOSTS = new Set(['partners.equiscore.app', 'admin.equiscore.app'])

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '')
}

export function consumerAppUrl(): string {
  const configured = process.env['NEXT_PUBLIC_CONSUMER_APP_URL']
  if (configured) return stripTrailingSlash(configured)

  if (typeof window !== 'undefined') {
    if (!PARTNER_HOSTS.has(window.location.hostname)) return window.location.origin
  }

  return DEFAULT_CONSUMER_APP_URL
}

export function absoluteConsumerUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  return `${consumerAppUrl()}${path.startsWith('/') ? path : `/${path}`}`
}

function appUrlForSurface(envKey: string, expectedHost: string, fallback: string): string {
  const configured = process.env[envKey]
  if (configured) return stripTrailingSlash(configured)

  if (typeof window !== 'undefined' && window.location.hostname === expectedHost) {
    return window.location.origin
  }

  return fallback
}

export function adminAppUrl(): string {
  return appUrlForSurface('NEXT_PUBLIC_ADMIN_APP_URL', 'admin.equiscore.app', DEFAULT_ADMIN_APP_URL)
}

export function partnerAppUrl(): string {
  return appUrlForSurface(
    'NEXT_PUBLIC_PARTNER_APP_URL',
    'partners.equiscore.app',
    DEFAULT_PARTNER_APP_URL
  )
}

export function absoluteAdminUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  return `${adminAppUrl()}${path.startsWith('/') ? path : `/${path}`}`
}

export function absolutePartnerUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  return `${partnerAppUrl()}${path.startsWith('/') ? path : `/${path}`}`
}
